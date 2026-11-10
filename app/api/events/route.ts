import { createClient, getServerProfile } from '@/lib/supabase-api';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await getServerProfile(supabase, user, 'department, department_id, role');

    // Tier 1: Try filtered query using department column (most common)
    if (profile && profile.role !== 'principal' && profile.department) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .or(`department.eq.${profile.department},department.is.null`)
        .order('date', { ascending: true });

      if (!error) return NextResponse.json(data ?? []);
      // If column filter fails, fall through to full fetch
    }

    // Tier 2: Full table fetch (principals, or when department filter fails)
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      // Tier 3: Absolute fallback — table might be empty or have schema issues
      console.error('Events fetch error:', error.message);
      return NextResponse.json([]);
    }

    return NextResponse.json(data ?? []);
  } catch (error: any) {
    console.error('Events GET exception:', error.message);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const profile = await getServerProfile(supabase, user, 'id, name, department, department_id, role');

    if (!profile || !['principal', 'hod', 'faculty'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build event data, omitting undefined columns gracefully
    const eventData: Record<string, any> = {
      title: body.title,
      description: body.description ?? null,
      category: body.category ?? 'other',
      date: body.date,
      time: body.time ?? null,
      location: body.location,
      created_by: user.id,
      created_by_name: profile.name ?? null,
      department: profile.department ?? body.department ?? null,
      attendees: body.attendees ?? [],
      max_capacity: body.max_capacity ?? body.maxCapacity ?? 100,
      status: body.status ?? 'upcoming',
    };

    // Only include department_id if it exists on the profile
    if (profile.department_id) {
      eventData.department_id = profile.department_id;
    }

    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
