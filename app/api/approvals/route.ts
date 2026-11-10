import { createClient } from '@/lib/supabase-api';
import { notifyLeaveDecision } from '@/lib/notifications';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Ensure profile exists (Self-healing for FK constraint)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      await supabase.from('profiles').insert([{
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown User',
        email: user.email || '',
        role: 'faculty'
      }]);
    }

    const approvalToInsert = {
      ...body,
      requested_by_id: user.id
    };

    const { data, error } = await supabase
      .from('approvals')
      .insert([approvalToInsert])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const supabase = await createClient();
    const body = await req.json();

    const { data, error } = await supabase
      .from('approvals')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    if (data.type === 'leave' && (data.status === 'approved' || data.status === 'rejected') && data.requested_by_id) {
      await notifyLeaveDecision(supabase, {
        leaveId: data.id,
        applicantId: data.requested_by_id,
        status: data.status,
        startDate: data.metadata?.start_date,
        endDate: data.metadata?.end_date,
        applicantName: data.requested_by_name
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
