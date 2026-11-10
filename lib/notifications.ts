import type { SupabaseClient } from '@supabase/supabase-js';
import * as emailService from './emailService';

export type NotificationType = 'announcement' | 'task' | 'leave' | 'meeting' | 'message' | 'system';

export interface NotificationInsert {
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  metadata?: Record<string, any> | null;
}

async function insertNotifications(
  supabase: SupabaseClient,
  notifications: NotificationInsert[]
) {
  if (!notifications.length) return;

  // Try with full payload first (link + metadata)
  const { error } = await supabase.from('notifications').insert(notifications);

  if (error) {
    // If columns are missing (schema cache issue), fall back to minimal insert
    if (error.message.includes('schema cache') || error.message.includes('column')) {
      console.warn('Notifications schema incomplete, falling back to minimal insert:', error.message);
      const minimal = notifications.map(({ user_id, title, message, type }) => ({
        user_id,
        title,
        message,
        type,
      }));
      const { error: fallbackError } = await supabase.from('notifications').insert(minimal);
      if (fallbackError) {
        // Final fallback: just log, never block the primary action
        console.error('Notifications insert failed (non-blocking):', fallbackError.message);
      }
    } else {
      console.error('Notifications insert failed (non-blocking):', error.message);
    }
  }
}

export async function notifyAnnouncement(
  supabase: SupabaseClient,
  payload: {
    announcementId: string;
    title: string;
    audience: 'all' | 'faculty' | 'students' | 'department';
    department?: string | null;
    content?: string;
  }
) {
  let query = supabase
    .from('profiles')
    .select('id, email, name')
    .eq('email_verified', true);

  if (payload.audience === 'faculty') query = query.eq('role', 'faculty');
  if (payload.audience === 'students') query = query.eq('role', 'student');
  if (payload.audience === 'department' && payload.department) {
    query = query.eq('department', payload.department);
  }

  const { data: recipients, error } = await query;
  if (error) throw new Error(error.message);

  // Send Emails
  if (recipients) {
    for (const user of recipients) {
      if (user.email) {
        emailService.sendAnnouncementNotification(
          user.email,
          user.id,
          payload.title,
          payload.content || 'New announcement posted'
        ).catch(console.error);
      }
    }
  }

  await insertNotifications(
    supabase,
    (recipients || []).map((user) => ({
      user_id: user.id,
      title: 'New Announcement',
      message: payload.title,
      type: 'announcement',
      link: '/dashboard/announcements',
      metadata: { announcement_id: payload.announcementId },
    }))
  );
}

export async function notifyTaskAssigned(
  supabase: SupabaseClient,
  payload: { taskId: string; assignedTo: string; title: string; dueDate?: string; assignedByName?: string }
) {
  const { data: user } = await supabase
    .from('profiles')
    .select('email, name, email_verified')
    .eq('id', payload.assignedTo)
    .single();

  if (user?.email_verified !== true) {
    return;
  }

  if (user?.email) {
    emailService.sendTaskAssignmentNotification(
      user.email,
      payload.assignedTo,
      payload.title,
      payload.dueDate || 'No deadline',
      payload.assignedByName || 'Administrator'
    ).catch(console.error);
  }

  await insertNotifications(supabase, [
    {
      user_id: payload.assignedTo,
      title: 'New Task Assigned',
      message: payload.title,
      type: 'task',
      link: '/dashboard/tasks',
      metadata: { task_id: payload.taskId },
    },
  ]);
}

export async function notifyLeaveDecision(
  supabase: SupabaseClient,
  payload: { 
    leaveId: string; 
    applicantId: string; 
    status: 'approved' | 'rejected';
    startDate?: string;
    endDate?: string;
    applicantName?: string;
  }
) {
  const { data: user } = await supabase
    .from('profiles')
    .select('email, name, email_verified')
    .eq('id', payload.applicantId)
    .single();

  if (user?.email_verified !== true) {
    return;
  }

  if (user.email) {
    emailService.sendLeaveStatusNotification(
      user.email,
      payload.applicantId,
      payload.applicantName || user.name,
      payload.status,
      payload.startDate || 'N/A',
      payload.endDate || 'N/A'
    ).catch(console.error);
  }

  await insertNotifications(supabase, [
    {
      user_id: payload.applicantId,
      title: payload.status === 'approved' ? 'Leave Approved' : 'Leave Rejected',
      message:
        payload.status === 'approved'
          ? 'Your leave request has been approved.'
          : 'Your leave request has been rejected.',
      type: 'leave',
      link: '/dashboard/leaves',
      metadata: { leave_id: payload.leaveId, status: payload.status },
    },
  ]);
}

export async function notifyMeetingInvitation(
  supabase: SupabaseClient,
  payload: { 
    meetingId: string; 
    title: string; 
    attendeeIds: string[]; 
    invitedBy?: string;
    date?: string;
    time?: string;
    location?: string;
  }
) {
  const recipientIds = payload.attendeeIds.filter((id) => id !== payload.invitedBy);
  
  const { data: recipients } = await supabase
    .from('profiles')
    .select('id, email, name')
    .in('id', recipientIds)
    .eq('email_verified', true);

  const notifiedIds = recipients?.map((user) => user.id) || [];

  if (recipients) {
    for (const user of recipients) {
      if (user.email) {
        emailService.sendMeetingInvitationNotification(
          user.email,
          user.id,
          payload.title,
          payload.date || 'TBD',
          payload.time || 'TBD',
          payload.location || 'Online'
        ).catch(console.error);
      }
    }
  }

  if (notifiedIds.length > 0) {
    await insertNotifications(
      supabase,
      notifiedIds.map((userId) => ({
        user_id: userId,
        title: 'Meeting Invitation',
        message: payload.title,
        type: 'meeting',
        link: '/dashboard/meetings',
        metadata: { meeting_id: payload.meetingId },
      }))
    );
  }
}

export async function notifyNewMessage(
  supabase: SupabaseClient,
  payload: { conversationId: string; senderId: string; messagePreview: string }
) {
  const { data: conversation, error } = await supabase
    .from('chat_conversations')
    .select('participant1_id, participant2_id')
    .eq('id', payload.conversationId)
    .single();

  if (error || !conversation) throw new Error(error?.message || 'Conversation not found');

  const recipients = [conversation.participant1_id, conversation.participant2_id].filter(
    (id) => id && id !== payload.senderId
  );

  await insertNotifications(
    supabase,
    recipients.map((userId) => ({
      user_id: userId,
      title: 'New Message',
      message: payload.messagePreview,
      type: 'message',
      link: '/dashboard/chat',
      metadata: { conversation_id: payload.conversationId },
    }))
  );
}
