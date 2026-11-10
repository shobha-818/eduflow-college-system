import nodemailer from 'nodemailer';
import { supabase } from './supabase';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 1. Welcome Email (Verification + Temp Password)
export async function sendWelcomeEmail(
  email: string, 
  name: string, 
  role: string, 
  tempPassword: string,
  verificationToken: string
) {
  const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}&email=${email}`;
  console.log(`Generated verification link: ${verificationLink}`);
  
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e4e8; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Welcome to EduFlow</h1>
        <p style="color: #6b7280; margin: 5px 0 0 0;">College Management System</p>
      </div>
      
      <div style="padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #2563eb; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 16px; color: #374151;">Hello <strong>${name}</strong>,</p>
        <p style="margin: 10px 0 0 0; color: #4b5563;">Your account has been successfully created as a <strong>${role.toUpperCase()}</strong>.</p>
      </div>
      
      <div style="margin-bottom: 25px;">
        <h3 style="color: #1f2937; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Your Login Credentials</h3>
        <p style="margin: 5px 0; color: #4b5563;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 5px 0; color: #4b5563;"><strong>Temporary Password:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #2563eb;">${tempPassword}</code></p>
      </div>
      
      <div style="text-align: center; margin: 35px 0;">
        <p style="margin-bottom: 20px; color: #4b5563; font-size: 14px;">Please click the button below to verify your email address and activate your account:</p>
        <a href="${verificationLink}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
          Verify My Account
        </a>
      </div>
      
      <div style="padding: 15px; background-color: #fffbeb; border-radius: 8px; border: 1px solid #fef3c7; margin-bottom: 25px;">
        <p style="margin: 0; color: #92400e; font-size: 13px;">
          <strong>Important:</strong> For security reasons, you will be required to change your password immediately after your first login.
        </p>
      </div>
      
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0 20px;" />
      
      <div style="text-align: center; color: #9ca3af; font-size: 12px;">
        <p style="margin: 5px 0;">&copy; ${new Date().getFullYear()} EduFlow College System. All rights reserved.</p>
        <p style="margin: 5px 0;">This is an automated message, please do not reply.</p>
      </div>
    </div>
  `;
  
  try {
    await transporter.sendMail({
      from: `"EduFlow" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to EduFlow - Verify Your Account',
      html
    });
    console.log(`✅ Welcome email sent to: ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Email failed: ${email}`, error);
    return { success: false };
  }
}

// 2. Leave Notification
export async function sendLeaveStatusNotification(
  email: string, 
  userId: string,
  applicantName: string, 
  status: string,
  startDate: string = 'N/A',
  endDate: string = 'N/A'
) {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e1e4e8; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 25px;">
        <h2 style="color: #2563eb; margin: 0; font-size: 24px;">Leave Request Update</h2>
      </div>
      
      <div style="padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid ${status === 'approved' || status === 'hod_approved' ? '#10b981' : '#ef4444'}; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 16px; color: #374151;">Hello <strong>${applicantName}</strong>,</p>
        <p style="margin: 10px 0 0 0; color: #4b5563;">Your leave request has been <strong>${status.toUpperCase().replace('_', ' ')}</strong>.</p>
      </div>
      
      <div style="margin-bottom: 25px;">
        <h3 style="color: #1f2937; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Request Details</h3>
        <p style="margin: 5px 0; color: #4b5563;"><strong>Start Date:</strong> ${startDate}</p>
        <p style="margin: 5px 0; color: #4b5563;"><strong>End Date:</strong> ${endDate}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/leaves" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
          View in Dashboard
        </a>
      </div>
      
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0 20px;" />
      
      <div style="text-align: center; color: #9ca3af; font-size: 12px;">
        <p style="margin: 5px 0;">&copy; ${new Date().getFullYear()} EduFlow College System.</p>
      </div>
    </div>
  `;
  
  try {
    await transporter.sendMail({
      from: `"EduFlow" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Leave Request: ${status.replace('_', ' ').toUpperCase()}`,
      html
    });
    await createInAppNotification(userId, `Leave ${status.replace('_', ' ')}`, `Your leave request has been ${status.replace('_', ' ')}`, 'leave', '/dashboard/leaves');
    return { success: true };
  } catch (error) {
    console.error(`❌ Leave email failed: ${email}`, error);
    await createInAppNotification(userId, `Leave ${status.replace('_', ' ')}`, `Your leave request has been ${status.replace('_', ' ')}`, 'leave', '/dashboard/leaves');
    return { success: false };
  }
}


// 3. Announcement Notification
export async function sendAnnouncementNotification(
  email: string, 
  userId: string,
  title: string, 
  content: string
) {
  const html = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>📢 New Announcement: ${title}</h2>
      <p>${content}</p>
      <hr />
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/announcements">Read more on dashboard</a>
    </div>
  `;
  
  try {
    await transporter.sendMail({
      from: `"EduFlow" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `New Announcement: ${title}`,
      html
    });
    await createInAppNotification(userId, title, content, 'announcement', '/dashboard/announcements');
    return { success: true };
  } catch (error) {
    console.error(`❌ Announcement email failed: ${email}`, error);
    await createInAppNotification(userId, title, content, 'announcement', '/dashboard/announcements');
    return { success: false };
  }
}

// Helper: Create in-app notification
export async function createInAppNotification(userId: string, title: string, message: string, type: string, link?: string) {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      link,
      read: false
    });
    console.log(`✅ Notification created for: ${userId}`);
  } catch (error) {
    console.error(`❌ Notification failed:`, error);
  }
}

// 4. Task Assignment
export async function sendTaskAssignmentNotification(
  email: string, 
  userId: string, 
  title: string, 
  dueDate: string, 
  assignedBy: string
) {
  const html = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>✅ New Task Assigned: ${title}</h2>
      <p><strong>Due Date:</strong> ${dueDate}</p>
      <p><strong>Assigned By:</strong> ${assignedBy}</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks">View Task</a>
    </div>
  `;
  try {
    await transporter.sendMail({ from: `"EduFlow" <${process.env.EMAIL_USER}>`, to: email, subject: `New Task: ${title}`, html });
    await createInAppNotification(userId, `New Task: ${title}`, `Due: ${dueDate}`, 'task', '/dashboard/tasks');
  } catch (error) {
    console.error(`❌ Task email failed: ${email}`, error);
    await createInAppNotification(userId, `New Task: ${title}`, `Due: ${dueDate}`, 'task', '/dashboard/tasks');
  }
}

// 5. Meeting Invitation
export async function sendMeetingInvitationNotification(
  email: string, 
  userId: string, 
  title: string, 
  date: string, 
  time: string, 
  location: string
) {
  const html = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>📅 Meeting Invitation: ${title}</h2>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      <p><strong>Location:</strong> ${location}</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/meetings">View Meeting</a>
    </div>
  `;
  try {
    await transporter.sendMail({ from: `"EduFlow" <${process.env.EMAIL_USER}>`, to: email, subject: `Meeting Invitation: ${title}`, html });
    await createInAppNotification(userId, `Meeting: ${title}`, `${date} at ${time}`, 'meeting', '/dashboard/meetings');
  } catch (error) {
    console.error(`❌ Meeting email failed: ${email}`, error);
    await createInAppNotification(userId, `Meeting: ${title}`, `${date} at ${time}`, 'meeting', '/dashboard/meetings');
  }
}

// 6. Simple Verification (Alternative to Welcome)
export async function sendVerificationEmail(email: string, name: string, token: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim().replace(/\/$/, '');
  const link = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  console.log(`Generated simple verification link: ${link}`);
  const html = `<div style="font-family: sans-serif; padding: 20px;"><h2>Verify Your Email</h2><p>Hello ${name},</p><p>Please click below to verify your account:</p><a href="${link}">Verify Email</a></div>`;
  try {
    await transporter.sendMail({ from: `"EduFlow" <${process.env.EMAIL_USER}>`, to: email, subject: 'Verify Your Email', html });
  } catch (error) {
    console.error(`❌ Verification email failed: ${email}`, error);
  }
}
