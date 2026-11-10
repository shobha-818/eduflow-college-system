import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-api';
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  createInAppNotification,
  sendAnnouncementNotification,
  sendTaskAssignmentNotification,
  sendLeaveStatusNotification,
  sendMeetingInvitationNotification
} from '@/lib/emailService';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  try {
    const { type, recipients, data } = await request.json();

    if (!type || !recipients || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, recipients, data' },
        { status: 400 }
      );
    }

    const results = [];

    switch (type) {
      case 'verification':
        // Send welcome email with credentials
        const { email, name, role, tempPassword, verificationToken, userId, department, phone } = data;
        
        // Ensure profile exists in public.profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            name,
            email,
            role,
            department,
            phone,
            email_verified: false,
            is_approved: true,
            verification_token: verificationToken,
            temporary_password: tempPassword // Store hashed or encrypted if security is higher, but here as requested
          });

        if (profileError) {
          console.error('Failed to sync profile:', profileError);
        }

        if (tempPassword) {
          await sendWelcomeEmail(email, name, role, tempPassword, verificationToken);
        } else {
          await sendVerificationEmail(email, name, verificationToken);
        }
        
        // Create welcome notification
        await createInAppNotification(
          userId,
          'Welcome to EduFlow!',
          `Your account has been created. Check your email for login credentials.`,
          'welcome',
          '/dashboard'
        );
        
        results.push({ email, status: 'sent' });
        break;

      case 'announcement':
        // Send announcement to all users
        for (const recipient of recipients) {
          try {
            await sendAnnouncementNotification(
              recipient.email,
              recipient.id,
              data.title,
              data.content
            );
            results.push({ email: recipient.email, status: 'sent' });
          } catch (error) {
            console.error(`Failed to send announcement to ${recipient.email}:`, error);
            results.push({ email: recipient.email, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }
        break;

      case 'task':
        // Send task assignment to specific user
        const taskRecipient = recipients[0];
        await sendTaskAssignmentNotification(
          taskRecipient.email,
          taskRecipient.id,
          data.title,
          data.dueDate,
          data.assignedByName
        );
        results.push({ email: taskRecipient.email, status: 'sent' });
        break;

      case 'leave':
        // Send leave status update
        const leaveRecipient = recipients[0];
        await sendLeaveStatusNotification(
          leaveRecipient.email,
          leaveRecipient.id,
          data.applicantName,
          data.status
        );
        results.push({ email: leaveRecipient.email, status: 'sent' });
        break;

      case 'meeting':
        // Send meeting invitations to all attendees
        for (const recipient of recipients) {
          try {
            await sendMeetingInvitationNotification(
              recipient.email,
              recipient.id,
              data.title,
              data.date,
              data.time,
              data.location
            );
            results.push({ email: recipient.email, status: 'sent' });
          } catch (error) {
            console.error(`Failed to send meeting invitation to ${recipient.email}:`, error);
            results.push({ email: recipient.email, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `${type} notifications processed`,
      results
    });

  } catch (error) {
    console.error('Notification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
