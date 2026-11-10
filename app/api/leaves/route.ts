import { createClient, getServerProfile } from '@/lib/supabase-api';
import { notifyLeaveDecision } from '@/lib/notifications';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await getServerProfile(supabase, user, 'department, role');
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    let query = supabase.from('leaves').select(`
      *,
      applicant_profile:profiles!applicant_id(name, email, department)
    `);

    // Filtering logic:
    // 1. Student/Faculty see their own leaves only
    // 2. HOD sees all leaves in their department (status: pending, hod_approved, etc.)
    //    - We fetch all with status filter, then do dept filtering in JS to handle null dept on leave row
    // 3. Principal sees all leaves across all departments
    if (profile.role === 'student' || profile.role === 'faculty') {
      query = query.eq('applicant_id', user.id);
    } else if (profile.role === 'hod') {
      // Fetch all non-student-specific leaves and filter department in JS below
      query = query.in('status', ['pending', 'hod_approved', 'approved', 'rejected']);
    } else if (profile.role === 'principal') {
      // Principal sees everything
      query = query.in('status', ['pending', 'hod_approved', 'approved', 'rejected']);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    let flattened = data.map((leave: any) => ({
      ...leave,
      applicant_name: leave.applicant_name || leave.applicant_profile?.name || 'Unknown',
      applicant_email: leave.applicant_profile?.email,
      department: leave.department || leave.applicant_profile?.department
    }));

    // HOD: filter by department after flattening (handles null dept on leave row)
    if (profile.role === 'hod' && profile.department) {
      flattened = flattened.filter((leave: any) => leave.department === profile.department);
    }

    return NextResponse.json(flattened);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, action } = body; // action: 'approve' | 'reject'

    if (!id || !action) {
      return NextResponse.json({ error: 'Leave ID and action are required' }, { status: 400 });
    }

    const profile = await getServerProfile(supabase, user, 'id, department, role, name');

    if (!profile || !['principal', 'hod'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Only HOD or Principal can approve/reject' }, { status: 403 });
    }

    // Get current leave request
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leaves')
      .select('*, applicant_profile:profiles!applicant_id(email, name)')
      .eq('id', id)
      .single();

    if (fetchError || !leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    let newStatus = '';
    if (action === 'reject') {
      newStatus = 'rejected';
    } else if (action === 'approve') {
      if (profile.role === 'hod') {
        newStatus = 'hod_approved';
      } else if (profile.role === 'principal') {
        newStatus = 'approved';
      }
    }

    if (!newStatus) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    // Update the leave status
    const { data, error } = await supabase
      .from('leaves')
      .update({
        status: newStatus,
        approved_by: user.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Notify the applicant
    await notifyLeaveDecision(supabase, {
      leaveId: id,
      applicantId: leaveRequest.applicant_id,
      status: (newStatus === 'hod_approved' ? 'approved' : newStatus) as 'approved' | 'rejected',
      startDate: leaveRequest.start_date,
      endDate: leaveRequest.end_date,
      applicantName: leaveRequest.applicant_profile?.name || leaveRequest.applicant_name
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Leave PUT error:', error);
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
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const leaveData = {
      applicant_id: user.id,
      applicant_name: profile.name || 'Unknown',
      type: body.type,
      start_date: body.start_date || body.startDate,
      end_date: body.end_date || body.endDate,
      reason: body.reason,
      department: profile.department || body.department || null,
      status: 'pending'
    };

    const { data, error } = await supabase.from('leaves').insert([leaveData]).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Leave POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
