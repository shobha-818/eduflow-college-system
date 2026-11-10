import { z } from 'zod';

// ===============================
// AUTH SCHEMAS
// ===============================

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address'),

  password: z
    .string()
    .min(
      6,
      'Password must be at least 6 characters'
    ),

  role: z.enum([
    'principal',
    'hod',
    'faculty',
    'student',
  ]),
});

export type LoginInput =
  z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z
    .string()
    .min(
      2,
      'Name must be at least 2 characters'
    ),

  email: z
    .string()
    .email('Invalid email address'),

  password: z
    .string()
    .min(
      6,
      'Password must be at least 6 characters'
    ),

  role: z.enum([
    'principal',
    'hod',
    'faculty',
    'student',
  ]),
});

export type RegisterInput =
  z.infer<typeof registerSchema>;


// ===============================
// STUDENT SCHEMAS
// ===============================

export const studentSchema = z.object({
  name: z
    .string()
    .min(
      2,
      'Name must be at least 2 characters'
    ),

  email: z
    .string()
    .email('Invalid email address'),

  rollNumber: z
    .string()
    .min(
      3,
      'Roll number required'
    ),

  department: z
    .string()
    .min(
      2,
      'Department required'
    ),

  semester: z
    .number()
    .min(1)
    .max(
      8,
      'Invalid semester'
    ),

  gpa: z
    .number()
    .min(0)
    .max(4)
    .optional(),

  phone: z
    .string()
    .regex(
      /^\d{10}$/,
      'Phone must be 10 digits'
    ),

  address: z
    .string()
    .min(
      5,
      'Address required'
    ),
});

export type StudentInput =
  z.infer<typeof studentSchema>;


// ===============================
// ATTENDANCE SCHEMAS
// ===============================

export const attendanceSchema =
  z.object({
    studentId: z.string(),

    studentName: z.string(),

    status: z.enum([
      'present',
      'absent',
      'late',
    ]),

    subject: z
      .string()
      .min(
        2,
        'Subject required'
      ),

    date: z.string(),
  });

export type AttendanceInput =
  z.infer<typeof attendanceSchema>;


// ===============================
// TIME SLOT SCHEMAS
// ===============================

export const timeSlotSchema =
  z.object({
    dayOfWeek: z
      .number()
      .min(0)
      .max(5),

    startTime: z
      .string()
      .regex(
        /^\d{2}:\d{2}$/,
        'Invalid time format'
      ),

    endTime: z
      .string()
      .regex(
        /^\d{2}:\d{2}$/,
        'Invalid time format'
      ),

    subject: z
      .string()
      .min(
        2,
        'Subject required'
      ),

    faculty: z
      .string()
      .min(
        2,
        'Faculty name required'
      ),

    room: z
      .string()
      .min(
        1,
        'Room required'
      ),

    semester: z
      .number()
      .min(1)
      .max(8),

    department: z
      .string()
      .min(
        2,
        'Department required'
      ),
  });

export type TimeSlotInput =
  z.infer<typeof timeSlotSchema>;


// ===============================
// ANNOUNCEMENT SCHEMAS
// ===============================

export const announcementSchema =
  z.object({
    title: z
      .string()
      .min(
        5,
        'Title must be at least 5 characters'
      ),

    content: z
      .string()
      .min(
        10,
        'Content must be at least 10 characters'
      ),

    audience: z.enum([
      'all',
      'faculty',
      'students',
      'department',
    ]),

    priority: z.enum([
      'low',
      'medium',
      'high',
    ]),
  });

export type AnnouncementInput =
  z.infer<typeof announcementSchema>;


// ===============================
// TASK SCHEMAS
// ===============================

export const taskSchema = z.object({
  title: z
    .string()
    .min(
      3,
      'Title required'
    ),

  description: z
    .string()
    .min(
      10,
      'Description required'
    ),

  assignedTo: z.string(),

  status: z.enum([
    'pending',
    'in-progress',
    'completed',
  ]),

  dueDate: z.string(),

  priority: z.enum([
    'low',
    'medium',
    'high',
  ]),
});

export type TaskInput =
  z.infer<typeof taskSchema>;


// ===============================
// LEAVE SCHEMAS
// ===============================

export const leaveSchema = z.object({
  type: z.enum([
    'sick',
    'casual',
    'earned',
  ]),

  startDate: z.string(),

  endDate: z.string(),

  reason: z
    .string()
    .min(
      10,
      'Reason required'
    ),
});

export type LeaveInput =
  z.infer<typeof leaveSchema>;


// ===============================
// MEETING SCHEMAS
// ===============================

export const meetingSchema =
  z.object({
    title: z
      .string()
      .min(
        3,
        'Title required'
      ),

    description: z
      .string()
      .min(
        10,
        'Description required'
      ),

    attendees: z
      .array(z.string())
      .min(
        1,
        'At least one attendee required'
      ),

    dateTime: z.string(),

    duration: z
      .number()
      .min(15)
      .max(480),

    location: z
      .string()
      .min(
        2,
        'Location required'
      ),
  });

export type MeetingInput =
  z.infer<typeof meetingSchema>;