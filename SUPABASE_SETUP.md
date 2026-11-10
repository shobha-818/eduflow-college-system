# Supabase Integration Setup Guide

This document explains the required environment variables and Supabase database setup for the EduFlow College Management System.

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase API Keys
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Where to Find These Values:

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the values for:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Database Tables

The following tables must exist in your Supabase database:

### 1. `profiles` (User Profiles)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('principal', 'hod', 'faculty', 'student')),
  department TEXT,
  semester INTEGER,
  phone TEXT,
  address TEXT,
  avatar TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### 2. `students` (Student Records)
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  roll_number TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  semester INTEGER NOT NULL,
  gpa DECIMAL(3,2),
  phone TEXT,
  address TEXT,
  enrollment_date DATE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### 3. `attendance` (Attendance Records)
```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  student_name TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  subject TEXT,
  faculty_id UUID,
  faculty_name TEXT,
  department TEXT,
  semester INTEGER,
  topic_covered TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

### 4. `announcements` (Announcements)
```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  audience TEXT CHECK (audience IN ('all', 'faculty', 'students', 'department')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  attachments TEXT[],
  created_at TIMESTAMP DEFAULT now()
);
```

### 5. `tasks` (Task Management)
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES profiles(id),
  assigned_by UUID NOT NULL,
  department TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in-progress', 'completed')),
  deadline DATE NOT NULL,
  due_date DATE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  created_by UUID,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### 6. `leaves` (Leave Requests)
```sql
CREATE TABLE leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES profiles(id),
  applicant_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sick', 'casual', 'earned')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  approved_by UUID REFERENCES profiles(id),
  applied_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now()
);
```

### 7. `meetings` (Meetings)
```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  attendees UUID[] NOT NULL,
  date_time TIMESTAMP NOT NULL,
  duration INTEGER,
  location TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT now()
);
```

### 8. `events` (Events & Activities)
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('academic', 'sports', 'cultural', 'workshop', 'other')),
  date DATE NOT NULL,
  time TEXT,
  location TEXT NOT NULL,
  department TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_by_name TEXT,
  attendees UUID[] DEFAULT '{}',
  max_capacity INTEGER DEFAULT 100,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed')),
  created_at TIMESTAMP DEFAULT now()
);
```

### 9. `time_slots` (Timetable)
```sql
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  subject TEXT NOT NULL,
  faculty TEXT NOT NULL,
  room TEXT NOT NULL,
  semester INTEGER,
  department TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
```

### 10. `approvals` (Approval Workflow)
```sql
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('leave', 'request', 'document')),
  requested_by UUID NOT NULL,
  requested_by_name TEXT NOT NULL,
  department TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reason TEXT,
  title TEXT NOT NULL,
  description TEXT,
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT now()
);
```

## Row Level Security (RLS)

Enable RLS on all tables for security:

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
```

### Example RLS Policy for Students Table:

```sql
-- Anyone can read students
CREATE POLICY "Enable read access for all" ON students
FOR SELECT USING (true);

-- Only principals and HODs can insert/update/delete students
CREATE POLICY "Enable insert/update/delete for admins" ON students
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('principal', 'hod')
  )
);
```

## Authentication Setup

### Enable Email/Password Authentication:

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Set **Confirm email** to "Enabled"
4. Configure email templates if needed

### Configure Redirect URLs:

In **Authentication** → **URL Configuration**:
- Add Redirect URL: `http://localhost:3000/dashboard` (for development)
- Add Redirect URL: `https://yourdomain.com/dashboard` (for production)
- Add Site URL: `http://localhost:3000` (for development)
- Add Site URL: `https://yourdomain.com` (for production)

## Testing the Integration

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test registration:**
   - Navigate to `http://localhost:3000/register`
   - Create a new account with a valid email
   - Verify the profile is created in Supabase

3. **Test login:**
   - Log out and navigate to `http://localhost:3000`
   - Log in with your credentials
   - Verify you're redirected to the dashboard

4. **Test role-based access:**
   - Create users with different roles (principal, hod, faculty, student)
   - Verify each role can only access their allowed pages

## Troubleshooting

### "User profile not found" error:
- Ensure the `profiles` table is created
- Check that the profile was inserted during signup
- Verify the user ID matches between auth and profiles table

### "Session expired" error:
- Check Supabase project is active
- Verify environment variables are set correctly
- Clear browser localStorage and retry

### 401 Unauthorized errors:
- Verify RLS policies are correct
- Check user has necessary permissions
- Review Supabase logs for policy violations

## Security Best Practices

1. **Never expose secret keys** in frontend code
2. **Use public keys** (anon key) in frontend
3. **Enable RLS** on all tables
4. **Set up appropriate RLS policies** per role
5. **Use HTTPS** in production
6. **Regularly rotate keys** if compromised
7. **Monitor Supabase logs** for suspicious activity

## Production Deployment

Before deploying to production:

1. Set up custom domain for Supabase
2. Configure environment variables on your hosting platform
3. Enable MFA on Supabase account
4. Set up automated backups
5. Test authentication flow end-to-end
6. Monitor error logs and performance
