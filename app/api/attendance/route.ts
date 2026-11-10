import { createClient, getServerProfile } from '@/lib/supabase-api';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await getServerProfile(supabase, user, 'department, role');

    let query = supabase.from('attendance').select('*').order('attendance_date', { ascending: false });

    // Filter by department for non-principals
    if (profile && profile.role !== 'principal' && profile.department) {
      query = query.eq('department', profile.department);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const profile = await getServerProfile(supabase, user, 'id, name, department, role');

    // Permissions: principal, hod, and faculty can mark attendance
    if (!profile || !['principal', 'hod', 'faculty'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const attendanceData = {
      student_id: body.student_id,
      student_name: body.student_name,
      faculty_id: user.id,
      faculty_name: body.faculty_name || profile.name || 'Faculty',
      subject: body.subject,
      status: body.status,
      attendance_date: body.attendance_date,
      department: profile.department || body.department || null,
      class_id: body.class_id,
      subject_id: body.subject_id,
      topic_covered: body.topic_covered || '',
    };

    const { data, error } = await supabase.from('attendance').insert([attendanceData]).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
