import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

async function safeInsertNotificationRows(rows: any[]) {
  if (!rows.length) return;

  try {
    const { error } = await supabase.from('notifications').insert(rows);
    if (!error) return;

    // Log the specific error for debugging
    console.warn(`Initial notification insert failed: ${error.message} (${error.code})`);

    // If it's a schema cache error or missing column, try a more minimal set
    if (
      error.message.includes('schema cache') ||
      error.message.includes('column') ||
      error.code === '42703' // undefined_column
    ) {
      // Try to insert one by one to isolate the problem or at least get some through
      for (const row of rows) {
        const { user_id, title, message, type, link } = row;
        
        // Final fallback: try with the most basic fields
        const { error: fallbackError } = await supabase.from('notifications').insert({
          user_id,
          title: title || 'Notification',
          message: message || '',
          type: type || 'system',
          // Optionally omit link if it might be the cause
          ...(link ? { link } : {})
        });

        if (fallbackError) {
          console.error(`Failed to insert notification fallback for user ${user_id}:`, fallbackError.message);
        }
      }
      return;
    }

    console.error('Failed to insert notifications:', error.message);
  } catch (err: any) {
    console.error('Critical error in safeInsertNotificationRows:', err.message);
  }
}

/**
 * EduFlow Supabase Synchronization Service
 * Handles data fetching and persistence between Supabase and the Zustand store.
 */

export const supabaseSync = {

  // =============================================
  // ANNOUNCEMENTS
  // =============================================
  async syncAnnouncements() {
    try {
      const res = await fetch('/api/announcements');
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to fetch announcements:', res.status, res.statusText, errorText);
        throw new Error(`Failed to fetch announcements: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      
      useAppStore.setState({ 
        announcements: data.map((a: any) => ({
          id: a.id, 
          title: a.title, 
          content: a.content, 
          audience: a.audience,
          priority: a.priority, 
          createdAt: a.created_at, 
          createdBy: a.created_by,
          attachments: a.attachments || [],
        })) 
      });
      return null;
    } catch (error) {
      console.warn('syncAnnouncements error:', error);
      return error;
    }
  },

  async addAnnouncement(announcement: any) {
    const res = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: announcement.title,
        content: announcement.content,
        audience: announcement.audience,
        priority: announcement.priority,
        attachments: announcement.attachments || [],
      }),
    });
    
    if (!res.ok) {
      // Safely parse: response might be HTML (error page) or JSON
      const bodyText = await res.text();
      let errorMsg = `Failed to add announcement (${res.status})`;
      try {
        const errorData = JSON.parse(bodyText);
        if (errorData?.error) errorMsg = `${errorData.error} (${res.status})`;
      } catch {
        // HTML or non-JSON body — use the status code message
      }
      throw new Error(errorMsg);
    }
    
    const data = await res.json();
    await this.syncAnnouncements();
    return data;
  },

  // =============================================
  // EVENTS
  // =============================================
  async syncEvents() {
    try {
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      
      useAppStore.setState({ 
        events: data.map((e: any) => ({
          id: e.id, 
          title: e.title, 
          description: e.description, 
          category: e.category,
          date: e.date, 
          time: e.time, 
          location: e.location, 
          department: e.department,
          createdBy: e.created_by, 
          createdByName: e.created_by_name,
          attendees: e.attendees || [], 
          maxCapacity: e.max_capacity,
          status: e.status, 
          createdAt: e.created_at,
        })) 
      });
      return null;
    } catch (error) {
      console.warn('syncEvents error:', error);
      return error;
    }
  },

  async addEvent(event: any) {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: event.title,
        description: event.description,
        category: event.category,
        date: event.date,
        time: event.time,
        location: event.location,
        department: event.department,
        max_capacity: event.max_capacity || event.maxCapacity,
        status: event.status || 'upcoming',
        created_by_name: event.created_by_name || event.createdByName,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to add event');
    }

    const data = await res.json();
    await this.syncEvents();
    return data;
  },

  async updateEvent(id: string, updates: any) {
    const { data, error } = await supabase
      .from('events')
      .update({
        title: updates.title,
        description: updates.description,
        category: updates.category,
        date: updates.date,
        time: updates.time,
        location: updates.location,
        department: updates.department,
        max_capacity: updates.maxCapacity ?? updates.max_capacity,
        status: updates.status,
        attendees: updates.attendees,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    await this.syncEvents();
    return data;
  },

  async deleteEvent(id: string) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    await this.syncEvents();
  },

  // =============================================
  // TASKS
  // =============================================
  async syncTasks() {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to fetch tasks:', res.status, res.statusText, errorText);
        throw new Error(`Failed to fetch tasks: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      
      useAppStore.setState({ 
        tasks: data.map((t: any) => ({
          id: t.id, 
          title: t.title, 
          description: t.description, 
          assignedTo: t.assigned_to,
          assignedToName: t.assigned_to_name,
          assignedBy: t.assigned_by, 
          assignedByName: t.assigned_by_name,
          department: t.department, 
          status: t.status,
          dueDate: t.due_date || t.deadline, 
          priority: t.priority,
          createdBy: t.created_by || t.assigned_by, 
          createdAt: t.created_at,
        })) 
      });
      return null;
    } catch (error) {
      console.warn('syncTasks error:', error);
      return error;
    }
  },

  async addTask(task: any) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        assigned_to: task.assignedTo || task.assigned_to,
        status: task.status || 'pending',
        due_date: task.dueDate || task.deadline,
        priority: task.priority || 'medium',
        department: task.department,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to add task');
    }

    const data = await res.json();
    await this.syncTasks();
    return data;
  },

  async updateTask(id: string, updates: any) {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        title: updates.title,
        description: updates.description,
        assigned_to: updates.assignedTo || updates.assigned_to,
        status: updates.status,
        due_date: updates.dueDate || updates.deadline || updates.due_date,
        priority: updates.priority,
        department: updates.department,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    await this.syncTasks();
    return data;
  },

  // =============================================
  // ATTENDANCE
  // =============================================
  async syncAttendance() {
    const res = await fetch('/api/attendance');
    if (!res.ok) return null;
    const data = await res.json();
    useAppStore.setState({ attendanceRecords: data.map((a: any) => ({
      id: a.id, 
      studentId: a.student_id, 
      studentName: a.student_name,
      facultyId: a.faculty_id, 
      facultyName: a.faculty_name, 
      subject: a.subject,
      subjectId: a.subject_id,
      status: a.status, 
      attendanceDate: a.attendance_date, 
      department: a.department,
      semester: a.semester, 
      topicCovered: a.topic_covered, 
      createdAt: a.created_at,
      classId: a.class_id,
      departmentId: a.department_id
    })) });
    return null;
  },

  // ✅ ADD THIS MISSING FUNCTION
  async addAttendance(record: any) {
    try {
      // Normalize incoming record: convert empty strings to null
      const payload = {
        student_id: record.student_id || null,
        student_name: record.student_name || null,
        attendance_date: record.attendance_date || null,
        status: record.status || null,
        subject: record.subject || null,
        subject_id: record.subject_id || null,
        class_id: record.class_id || null,
        department_id: record.department_id || null,
        topic_covered: record.topic_covered || null,
        faculty_id: record.faculty_id || null,
        faculty_name: record.faculty_name || null,
      };

      // Helper: basic UUID validation (matches common UUID formats)
      const isValidUUID = (id: any) => {
        if (!id || typeof id !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      };

      // Validate student_id: must be present and a valid UUID
      if (!payload.student_id || !isValidUUID(payload.student_id)) {
        const msg = `Invalid or missing student_id for attendance insert: ${String(payload.student_id)}`;
        console.error(msg);
        throw new Error(msg);
      }

      // Ensure the referenced student exists to avoid FK violations
      try {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', payload.student_id)
          .maybeSingle();

        if (profileErr) {
          console.warn('profiles lookup error:', profileErr.message || profileErr);
        }

        if (!profile) {
          const msg = `Referenced student_id not found in profiles: ${payload.student_id}`;
          console.error(msg);
          throw new Error(msg);
        }
      } catch (e) {
        console.error('Error validating student existence:', e);
        throw e;
      }

      // Log payload for easier debugging of failing inserts
      console.debug('addAttendance payload:', payload);

      const { data, error } = await supabase
        .from('attendance')
        .insert([{
          student_id: payload.student_id,
          student_name: payload.student_name,
          attendance_date: payload.attendance_date,
          status: payload.status,
          subject: payload.subject,
          subject_id: payload.subject_id,
          class_id: payload.class_id,
          department_id: payload.department_id,
          topic_covered: payload.topic_covered,
          faculty_id: payload.faculty_id,
          faculty_name: payload.faculty_name
        }])
        .select();
      
      if (error) throw error;
      
      // Update store with new records
      const currentRecords = useAppStore.getState().attendanceRecords || [];
      const newRecords = (data || []).map((a: any) => ({
        id: a.id, 
        studentId: a.student_id, 
        studentName: a.student_name,
        facultyId: a.faculty_id, 
        facultyName: a.faculty_name, 
        subject: a.subject,
        subjectId: a.subject_id,
        status: a.status, 
        attendanceDate: a.attendance_date, 
        department: a.department,
        semester: a.semester, 
        topicCovered: a.topic_covered, 
        createdAt: a.created_at,
        classId: a.class_id,
        departmentId: a.department_id
      }));
      
      useAppStore.setState({ 
        attendanceRecords: [...currentRecords, ...newRecords] 
      });
      
      return data;
    } catch (error: any) {
      const rawMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error)) || '';
      console.error('addAttendance error:', rawMsg, error);

      // If the error indicates a missing column in the attendance table (schema cache),
      // attempt a fallback insert that omits the offending field.
      if (/faculty_name|column \"faculty_name\" does not exist|Could not find the 'faculty_name' column/i.test(rawMsg) || error?.code === '42703') {
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('attendance')
            .insert([{
              student_id: record.student_id || null,
              student_name: record.student_name || null,
              attendance_date: record.attendance_date || null,
              status: record.status || null,
              subject: record.subject || null,
              subject_id: record.subject_id || null,
              class_id: record.class_id || null,
              department_id: record.department_id || null,
              topic_covered: record.topic_covered || null,
              faculty_id: record.faculty_id || null
            }])
            .select();

          if (fallbackError) {
            const fm = fallbackError.message || JSON.stringify(fallbackError);
            console.error('addAttendance fallback insert failed:', fm, fallbackError);
            throw new Error(fm);
          }

          // Update store with fallback inserted records
          const currentRecords = useAppStore.getState().attendanceRecords || [];
          const newRecords = (fallbackData || []).map((a: any) => ({
            id: a.id,
            studentId: a.student_id,
            studentName: a.student_name,
            facultyId: a.faculty_id,
            facultyName: a.faculty_name || null,
            subject: a.subject,
            subjectId: a.subject_id,
            status: a.status,
            attendanceDate: a.attendance_date,
            department: a.department,
            semester: a.semester,
            topicCovered: a.topic_covered,
            createdAt: a.created_at,
            classId: a.class_id,
            departmentId: a.department_id
          }));

          useAppStore.setState({ attendanceRecords: [...currentRecords, ...newRecords] });
          return fallbackData;
        } catch (fallbackErr: any) {
          const fm = fallbackErr?.message || (typeof fallbackErr === 'string' ? fallbackErr : JSON.stringify(fallbackErr));
          console.error('addAttendance fallback error:', fm, fallbackErr);
          throw new Error(fm);
        }
      }

      // Default: rethrow normalized error
      throw new Error(rawMsg || 'Unknown addAttendance error');
    }
  },

  // =============================================
  // LEAVES
  // =============================================
  async syncLeaves() {
    try {
      const res = await fetch('/api/leaves');
      if (!res.ok) throw new Error('Failed to fetch leaves');
      
      const text = await res.text();
      if (!text) {
        console.warn('syncLeaves: Empty response');
        useAppStore.setState({ leaves: [] });
        return null;
      }
      
      const data = JSON.parse(text);
      
      useAppStore.setState({ leaves: data.map((l: any) => ({
        id: l.id, 
        applicantId: l.applicant_id, 
        applicantName: l.applicant_name,
        applicantEmail: l.applicant_email,
        type: l.type, 
        startDate: l.start_date, 
        endDate: l.end_date,
        reason: l.reason, 
        status: l.status, 
        approvedBy: l.approved_by, 
        appliedAt: l.created_at,
        department: l.department
      })) });
      return null;
    } catch (error) {
      console.warn('syncLeaves error:', error);
      return error;
    }
  },

  async applyLeave(leave: any) {
    const res = await fetch('/api/leaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: leave.type,
        start_date: leave.startDate || leave.start_date,
        end_date: leave.endDate || leave.end_date,
        reason: leave.reason,
        department: leave.department
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to apply for leave');
    }

    const data = await res.json();
    await this.syncLeaves();
    return data;
  },

  async updateLeaveStatus(id: string, action: 'approve' | 'reject', reason?: string) {
    const res = await fetch('/api/leaves', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, reason }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || `Failed to ${action} leave`);
    }

    const data = await res.json();
    await this.syncLeaves();
    toast.success(`Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
    return data;
  },


  // =============================================
  // MEETINGS
  // =============================================
  async syncMeetings() {
    try {
      // Remove .order('meeting_date') to prevent crashes if the column doesn't exist. We'll sort on the client side.
      const { data, error } = await supabase
        .from('meetings')
        .select('*');
      
      if (error) throw error;
      
      const { formatAttendeesNames } = await import('./userHelpers');
      
      let enrichedData = await Promise.all(data.map(async (m) => {
        const attendeeNames = await formatAttendeesNames(m.attendees);
        return {
          id: m.id,
          title: m.title,
          description: m.description,
          attendees: m.attendees || [], 
          attendeeNames: attendeeNames, 
          dateTime: m.meeting_date || m.date_time,
          duration: m.duration || 60,
          location: m.location || 'Online',
          createdBy: m.created_by,
        };
      }));
      
      // Sort enrichedData client-side by dateTime descending
      enrichedData.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
      
      useAppStore.setState({ meetings: enrichedData });
      return null;
    } catch (error: any) {
      // Use console.warn to avoid triggering the Next.js Error Overlay
      console.warn('syncMeetings error:', error?.message || error);
      return error;
    }
  },

  async addMeeting(meeting: any) {
    const response = await fetch('/api/meetings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: meeting.title,
        description: meeting.description,
        attendees: meeting.attendees,
        meeting_date: meeting.dateTime,
        duration: meeting.duration,
        location: meeting.location
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Failed to create meeting');
    }

    await this.syncMeetings();
    return data;
  },

  // =============================================
  // CHAT FUNCTIONS
  // =============================================

  async syncMessages(conversationId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*, sender:profiles!sender_id(id, name, email, role)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const formattedMessages = data.map((msg: any) => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      content: msg.content,
      read: msg.read || false,
      createdAt: msg.created_at,
      sender: msg.sender
    }));

    useAppStore.setState({ messages: formattedMessages });
    return formattedMessages;
  },

  async uploadChatMedia(
    conversationId: string,
    file: File
  ): Promise<{ url: string; name: string; size: number; type: string }> {
    const ext = file.name.split('.').pop();
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const path = `chat-files/${conversationId}/${uniqueName}`;

    const { error } = await supabase.storage
      .from('chat-media')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data: publicData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(path);

    return {
      url: publicData.publicUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    };
  },

  async sendMessage(conversationId: string, content: string, media?: { url: string; name: string; size: number; type: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Store media as JSON payload, plain text otherwise
    const messageContent = media
      ? JSON.stringify({ text: content, media })
      : content;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: messageContent,
      });

    if (error) throw error;

    const lastMessagePreview = media
      ? `📎 ${media.name}`
      : content;

    await supabase
      .from('chat_conversations')
      .update({ last_message: lastMessagePreview, last_message_time: new Date().toISOString() })
      .eq('id', conversationId);

    await this.notifyNewMessage(conversationId, lastMessagePreview, user.id);
    await this.syncMessages(conversationId);
    return { success: true };
  },

  async getOrCreateDirectConversation(otherUserId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: existing } = await supabase
      .from('chat_conversations')
      .select('id')
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .or(`participant1_id.eq.${otherUserId},participant2_id.eq.${otherUserId}`)
      .maybeSingle();

    if (existing) return existing.id;

    const { data: newConv, error } = await supabase
      .from('chat_conversations')
      .insert({ participant1_id: user.id, participant2_id: otherUserId })
      .select()
      .single();

    if (error) throw error;
    return newConv.id;
  },

  async syncConversations() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('chat_conversations')
      .select(`
        id,
        participant1_id,
        participant2_id,
        last_message,
        last_message_time,
        participant1:profiles!participant1_id(id, name, email, role),
        participant2:profiles!participant2_id(id, name, email, role)
      `)
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order('last_message_time', { ascending: false });

    if (error) throw error;

    const formattedConversations = data.map((conv: any) => {
      const otherUser = conv.participant1_id === user.id ? conv.participant2 : conv.participant1;
      return {
        id: conv.id,
        participants: [conv.participant1_id, conv.participant2_id],
        isGroup: false,
        name: otherUser?.name || null,
        lastMessage: conv.last_message,
        lastMessageTime: conv.last_message_time,
        createdBy: conv.participant1_id,
        createdAt: conv.created_at,
        otherUser: otherUser
      };
    }).filter((conv: any, index: number, self: any[]) => self.findIndex(item => item.id === conv.id) === index);

    useAppStore.setState({ conversations: formattedConversations });
    return formattedConversations;
  },

  subscribeToNewMessages(conversationId: string, onNewMessage: (message: any) => void) {
    const subscription = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const { data: sender, error } = await supabase
            .from('profiles')
            .select('id, name, email, role')
            .eq('id', payload.new.sender_id)
            .single();

          if (error) {
            console.error('Failed to fetch sender for realtime message:', error);
            return;
          }

          const newMessage = {
            id: payload.new.id,
            conversationId: payload.new.conversation_id,
            senderId: payload.new.sender_id,
            content: payload.new.content,
            read: payload.new.read,
            createdAt: payload.new.created_at,
            sender
          };

          onNewMessage(newMessage);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  // =============================================
  // STUDENTS & OTHERS
  // =============================================
  async syncStudents() {
    try {
      // Fetch profiles separately from students to avoid schema cache relationship errors
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('name');

      if (profilesError) {
        throw profilesError;
      }
      
      // Attempt to fetch academic data from students table separately
      const { data: academicData } = await supabase
        .from('students')
        .select('email, roll_number, gpa, enrollment_date');
        
      const academicMap = new Map();
      if (academicData) {
        academicData.forEach(s => {
          if (s.email) academicMap.set(s.email, s);
        });
      }

      if (profilesData) {
        useAppStore.setState({ students: profilesData.map((s: any) => {
          const academic = academicMap.get(s.email) || {};
          return {
            id: s.id, 
            name: s.name, 
            email: s.email, 
            rollNumber: academic.roll_number || 'N/A',
            department: s.department, 
            semester: s.semester || 1, 
            gpa: parseFloat(academic.gpa || 0),
            phone: s.phone, 
            address: s.address, 
            enrollmentDate: academic.enrollment_date || new Date().toISOString()
          };
        }) });
        return null;
      }
    } catch (error: any) {
      console.warn('syncStudents error:', error?.message || error);
      return error;
    }
  },

  async addStudent(student: any) {
    const { data, error } = await supabase
      .from('students')
      .insert([{
        name: student.name,
        email: student.email,
        roll_number: student.rollNumber,
        department: student.department,
        semester: student.semester,
        gpa: student.gpa,
        phone: student.phone,
        address: student.address,
        enrollment_date: student.enrollmentDate
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    await this.syncStudents();
    return data;
  },

  async updateStudent(id: string, student: any) {
    const { data, error } = await supabase
      .from('students')
      .update({
        name: student.name,
        email: student.email,
        roll_number: student.rollNumber,
        department: student.department,
        semester: student.semester,
        gpa: student.gpa,
        phone: student.phone,
        address: student.address
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    await this.syncStudents();
    return data;
  },

  async deleteStudent(id: string) {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    await this.syncStudents();
  },

  async syncTimeSlots() {
    const { data, error } = await supabase.from('time_slots').select('*').order('day_of_week');
    if (error) return error;
    if (data) {
      useAppStore.setState({ timeSlots: data.map((t: any) => ({
        id: t.id, dayOfWeek: t.day_of_week, startTime: t.start_time, endTime: t.end_time,
        subject: t.subject, faculty: t.faculty, room: t.room, semester: t.semester, department: t.department
      })) });
    }
    return null;
  },

  async addTimeSlot(slot: any) {
    const { data, error } = await supabase
      .from('time_slots')
      .insert([{
        day_of_week: slot.dayOfWeek || slot.day_of_week,
        start_time: slot.startTime || slot.start_time,
        end_time: slot.endTime || slot.end_time,
        subject: slot.subject,
        faculty: slot.faculty,
        room: slot.room,
        semester: slot.semester,
        department: slot.department
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    await this.syncTimeSlots();
    return data;
  },

  async updateTimeSlot(id: string, slot: any) {
    const { data, error } = await supabase
      .from('time_slots')
      .update({
        day_of_week: slot.dayOfWeek || slot.day_of_week,
        start_time: slot.startTime || slot.start_time,
        end_time: slot.endTime || slot.end_time,
        subject: slot.subject,
        faculty: slot.faculty,
        room: slot.room,
        semester: slot.semester,
        department: slot.department
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    await this.syncTimeSlots();
    return data;
  },

  async deleteTimeSlot(id: string) {
    const { error } = await supabase
      .from('time_slots')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    await this.syncTimeSlots();
  },

  async syncDepartments() {
    const res = await fetch('/api/departments');
    if (!res.ok) return null;
    const data = await res.json();
    useAppStore.setState({ departments: data.map((d: any) => ({
      id: d.id, name: d.name, code: d.code, hodId: d.hod_id, createdAt: d.created_at
    })) });
    return null;
  },

  async syncClasses() {
    const res = await fetch('/api/classes');
    if (!res.ok) return null;
    const data = await res.json();
    useAppStore.setState({ classes: data.map((c: any) => ({
      id: c.id, name: c.name, departmentId: c.department_id, semester: c.semester, createdAt: c.created_at
    })) });
    return null;
  },

  async syncSubjects() {
    const res = await fetch('/api/subjects');
    if (!res.ok) return null;
    const data = await res.json();
    useAppStore.setState({ subjects: data.map((s: any) => ({
      id: s.id, name: s.name, code: s.code, departmentId: s.department_id, semester: s.semester, createdAt: s.created_at
    })) });
    return null;
  },

  async syncApprovals() {
    const res = await fetch('/api/approvals');
    if (!res.ok) return null;
    const data = await res.json();
    useAppStore.setState({ approvals: data.map((a: any) => ({
      id: a.id, type: a.type, requestedBy: a.requested_by_id, requestedByName: a.requested_by_name,
      department: a.department, status: a.status, reason: a.reason, title: a.title,
      description: a.description, approvedBy: a.approved_by, approvedAt: a.approved_at, createdAt: a.created_at
    })) });
    return null;
  },

  async syncNotifications() {
    const user = useAppStore.getState().currentUser;
    if (!user) return null;
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) return error;
    if (data) {
      useAppStore.setState({ 
        notifications: data.map((n: any) => ({
          id: n.id, userId: n.user_id, title: n.title, message: n.message,
          type: n.type, read: n.read, createdAt: n.created_at, link: n.link
        })),
        unreadNotificationsCount: data.filter(n => !n.read).length
      });
    }
    return null;
  },

  async markNotificationAsRead(id: string) {
    const { error } = await supabase.from('notifications').update({ read: true, read_at: new Date().toISOString() }).eq('id', id);
    if (error) throw new Error(error.message);
    await this.syncNotifications();
  },

  async subscribeToNotifications(onInsert?: (notification: any) => void) {
    const user = useAppStore.getState().currentUser;
    if (!user) return () => {};

    const channelId = `notifications-${user.id}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = {
            id: payload.new.id,
            userId: payload.new.user_id,
            title: payload.new.title,
            message: payload.new.message,
            type: payload.new.type,
            read: payload.new.read,
            createdAt: payload.new.created_at,
            link: payload.new.link,
          };

          onInsert?.(notification);
          toast.info(notification.title, { description: notification.message });
          this.syncNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async notifyMeetingInvitees(payload: { meetingId: string; title: string; attendees: string[]; createdBy?: string }) {
    const recipients = payload.attendees.filter((id) => id && id !== payload.createdBy);
    if (!recipients.length) return;

    const rows = recipients.map((userId) => ({
      user_id: userId,
      title: 'Meeting Invitation',
      message: payload.title,
      type: 'meeting',
      link: '/dashboard/meetings',
      metadata: { meeting_id: payload.meetingId },
    }));

    await safeInsertNotificationRows(rows);
  },

  async notifyNewMessage(conversationId: string, content: string, senderId: string) {
    const { data: conversation, error: conversationError } = await supabase
      .from('chat_conversations')
      .select('participant1_id, participant2_id')
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) return;

    const recipients = [conversation.participant1_id, conversation.participant2_id].filter(
      (id) => id && id !== senderId
    );
    if (!recipients.length) return;

    const rows = recipients.map((userId) => ({
      user_id: userId,
      title: 'New Message',
      message: content.length > 120 ? `${content.slice(0, 120)}...` : content,
      type: 'message',
      link: '/dashboard/chat',
      metadata: { conversation_id: conversationId },
    }));

    await safeInsertNotificationRows(rows);
  },

  // =============================================
  // REALTIME & UTILS
  // =============================================
  // =============================================
  // REALTIME & UTILS
  // =============================================
  
  /**
   * Activates real-time listening for all major tables
   * This is more efficient than separate subscriptions for every table
   */
  subscribeAll() {
    const uniqueId = Math.random().toString(36).substring(7);
    const channelName = `global-sync-${uniqueId}`;
    console.log(`[EduFlow] Activating global real-time sync (${channelName})...`);
    
    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public' }, 
        (payload: any) => {
          if (!useAppStore.getState().currentUser) return;
          console.log(`[Realtime] Change detected in ${payload.table}:`, payload.eventType);
          
          // Refresh specific data based on which table changed
          switch (payload.table) {
            case 'notifications': this.syncNotifications(); break;
            case 'chat_messages': this.syncConversations(); break;
            case 'attendance': this.syncAttendance(); break;
            case 'tasks': this.syncTasks(); break;
            case 'events': this.syncEvents(); break;
            case 'announcements': this.syncAnnouncements(); break;
            case 'leaves': this.syncLeaves(); break;
            case 'approvals': this.syncApprovals(); break;
            default: this.syncAll(); // Fallback for other tables
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Global real-time sync active (${channelName})`);
        } else if (status === 'CHANNEL_ERROR') {
          console.warn(`❌ Global real-time sync failed to connect (${channelName})`);
        }
      });
      
    return () => {
      console.log(`[EduFlow] Deactivating global real-time sync (${channelName})`);
      supabase.removeChannel(channel);
    };
  },

  async syncAll() {
    if (!useAppStore.getState().currentUser) return;
    console.log('[EduFlow] Running full system sync...');
    await Promise.allSettled([
      this.syncAttendance(), this.syncAnnouncements(), this.syncTasks(),
      this.syncLeaves(), this.syncEvents(), this.syncStudents(),
      this.syncTimeSlots(), this.syncApprovals(), this.syncNotifications(),
      this.syncConversations(), this.syncDepartments(), this.syncClasses(),
      this.syncSubjects(), this.syncMeetings()
    ]);
  }
};