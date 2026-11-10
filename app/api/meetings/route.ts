import { createClient } from '@/lib/supabase-api';
import { notifyMeetingInvitation } from '@/lib/notifications';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Simple fetch — avoid filtering on columns that may not exist yet
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('meeting_date', { ascending: true });

    if (error) {
      // meeting_date column may not exist yet — try date_time fallback
      const { data: fallback, error: fallbackError } = await supabase
        .from('meetings')
        .select('*');

      if (fallbackError) {
        console.error('Meetings fetch error:', fallbackError.message);
        return NextResponse.json([]);
      }
      return NextResponse.json(fallback ?? []);
    }

    return NextResponse.json(data ?? []);
  } catch (error: any) {
    console.error('Meetings GET exception:', error.message);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, department, role')
      .eq('id', user.id)
      .single();

    if (!profile || !['principal', 'hod', 'faculty'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const attendees = Array.isArray(body.attendees) ? body.attendees : [];

    // Core data — columns guaranteed to exist on a fresh meetings table
    const coreData: Record<string, any> = {
      title: body.title,
      description: body.description ?? null,
      attendees,
      meeting_date: body.meeting_date || body.dateTime || new Date().toISOString(),
      created_by: user.id,
    };

    // Try inserting with optional columns first
    const fullData = {
      ...coreData,
      duration: body.duration ?? 60,
      location: body.location ?? 'Online',
      created_by_name: profile.name ?? null,
      department: profile.role === 'principal'
        ? (body.department ?? null)
        : (profile.department ?? null),
    };

    const { data, error } = await supabase
      .from('meetings')
      .insert([fullData])
      .select()
      .single();

    if (error) {
      // If optional columns are missing, retry with core data only
      if (error.message.includes('schema cache') || error.message.includes('column')) {
        console.warn('Meetings full insert failed, retrying with core data:', error.message);
        const { data: fallback, error: fallbackError } = await supabase
          .from('meetings')
          .insert([coreData])
          .select()
          .single();

        if (fallbackError) {
          return NextResponse.json({ error: fallbackError.message }, { status: 400 });
        }

        // Notify attendees (non-blocking)
        if (fallback?.id) {
          notifyMeetingInvitation(supabase, {
            meetingId: fallback.id,
            title: fallback.title,
            attendeeIds: attendees,
            invitedBy: user.id,
            date: fallback.meeting_date,
            time: body.time ?? 'TBD',
            location: 'Online',
          }).catch(console.error);
        }

        return NextResponse.json(fallback);
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Notify attendees (non-blocking — won't crash the response)
    if (data?.id) {
      notifyMeetingInvitation(supabase, {
        meetingId: data.id,
        title: data.title,
        attendeeIds: attendees,
        invitedBy: user.id,
        date: data.meeting_date ?? body.dateTime,
        time: body.time ?? 'TBD',
        location: data.location ?? 'Online',
      }).catch(console.error);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
