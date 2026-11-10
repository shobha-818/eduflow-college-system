import { createClient, getServerProfile, type ServerProfile } from '@/lib/supabase-api';
import { notifyAnnouncement } from '@/lib/notifications';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await getServerProfile(supabase, user, 'department, role');

    let query = supabase.from('announcements').select('*').order('created_at', { ascending: false });

    if (profile && profile.role !== 'principal' && profile.department) {
      query = query.or(`department.eq.${profile.department},audience.eq.all`);
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
    let profile: ServerProfile | null = await getServerProfile(supabase, user, 'id, name, department, role');

    // Auto-create a minimal profile if missing (e.g., deleted row but auth still active)
    if (!profile) {
      console.warn('[announcements POST] Profile missing for authenticated user, attempting auto-create:', user.id);
      const { data: created, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          role: user.user_metadata?.role || 'student',
          is_approved: true,
        })
        .select('id, name, department, role')
        .maybeSingle();

      const fallbackProfile: ServerProfile = {
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        department: user.user_metadata?.department || null,
        role: (user.user_metadata?.role as string) || 'student',
      };

      if (createError) {
        console.error('[announcements POST] Failed to auto-create profile in DB:', {
          userId: user.id,
          message: createError.message,
          code: createError.code,
          details: createError.details,
          hint: createError.hint,
        });
        profile = fallbackProfile;
        console.warn('[announcements POST] Using in-memory fallback profile for user:', user.id, '| role:', profile.role);
      } else if (!created || typeof created !== 'object' || !('id' in created)) {
        console.error('[announcements POST] Profile auto-create returned no data for user:', user.id);
        profile = fallbackProfile;
        console.warn('[announcements POST] Using in-memory fallback profile for user:', user.id, '| role:', profile.role);
      } else {
        profile = created as unknown as ServerProfile;
        console.log('[announcements POST] Profile auto-created successfully for user:', user.id, '| role:', profile.role);
      }
    }

    // Permissions: principal, hod, and faculty can post announcements
    const allowedRoles = ['principal', 'hod', 'faculty'];
    if (!allowedRoles.includes(profile.role)) {
      console.error('[announcements POST] Forbidden – resolved role:', profile.role, '| user:', user.id);
      return NextResponse.json({ error: 'Forbidden: only principal, HOD or faculty can post announcements' }, { status: 403 });
    }

    const announcementData = {
      ...body,
      created_by: user.id,
      department: profile.department || body.department || null,
    };

    const { data, error } = await supabase.from('announcements').insert([announcementData]).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await notifyAnnouncement(supabase, {
      announcementId: data.id,
      title: data.title,
      audience: data.audience,
      department: data.department,
      content: data.content,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
