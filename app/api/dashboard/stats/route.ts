import { createClient, getServerProfile, type ServerProfile } from '@/lib/supabase-api';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let profile: ServerProfile | null = await getServerProfile(supabase, user, 'role, id, name, department');

    // Auto-create minimal profile if missing
    if (!profile) {
      console.warn('[dashboard/stats GET] Profile missing for authenticated user, attempting auto-create:', user.id);
      const { data: created, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          role: user.user_metadata?.role || 'student',
          is_approved: true,
        })
        .select('role, id, name, department')
        .maybeSingle();

      const fallbackProfile: ServerProfile = {
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        department: user.user_metadata?.department || null,
        role: (user.user_metadata?.role as string) || 'student',
      };

      if (createError) {
        console.error('[dashboard/stats GET] Failed to auto-create profile in DB:', {
          userId: user.id,
          message: createError.message,
          code: createError.code,
          details: createError.details,
          hint: createError.hint,
        });
        profile = fallbackProfile;
        console.warn('[dashboard/stats GET] Using in-memory fallback profile for user:', user.id, '| role:', profile.role);
      } else if (!created || typeof created !== 'object' || !('id' in created)) {
        console.error('[dashboard/stats GET] Profile auto-create returned no data for user:', user.id);
        profile = fallbackProfile;
        console.warn('[dashboard/stats GET] Using in-memory fallback profile for user:', user.id, '| role:', profile.role);
      } else {
        profile = created as unknown as ServerProfile;
        console.log('[dashboard/stats GET] Profile auto-created successfully for user:', user.id, '| role:', profile.role);
      }
    }

    const stats: any = {};

    // 1. Weekly Attendance Trend (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split('T')[0];

    let attendanceQuery = supabase
      .from('attendance')
      .select('status, attendance_date')
      .gte('attendance_date', dateStr);

    if (profile.role === 'student') {
      attendanceQuery = attendanceQuery.eq('student_id', user.id);
    } else if (profile.role === 'hod') {
      // Prevent undefined value error in Supabase eq()
      attendanceQuery = attendanceQuery.eq('department', profile.department || null);
    }

    const { data: attendanceData, error: attendanceError } = await attendanceQuery;
    
    if (!attendanceError && attendanceData) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const trendMap: Record<string, { present: number; total: number }> = {};
      
      // Initialize trend map for the last 7 days
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayName = days[d.getDay()];
        trendMap[dayName] = { present: 0, total: 0 };
      }

      attendanceData.forEach((record) => {
        const d = new Date(record.attendance_date);
        const dayName = days[d.getDay()];
        if (trendMap[dayName]) {
          trendMap[dayName].total += 1;
          if (record.status === 'present') {
            trendMap[dayName].present += 1;
          }
        }
      });

      stats.attendanceTrend = Object.entries(trendMap).map(([day, values]) => ({
        date: day,
        present: values.total > 0 ? Math.round((values.present / values.total) * 100) : 0,
        absent: values.total > 0 ? Math.round(((values.total - values.present) / values.total) * 100) : 0
      })).reverse();
      
      const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      stats.attendanceTrend.sort((a: any, b: any) => dayOrder.indexOf(a.date) - dayOrder.indexOf(b.date));
    }

    // 2. Student Distribution (For Principal/HOD)
    if (profile.role === 'principal' || profile.role === 'hod') {
      const { data: students, error: studentError } = await supabase
        .from('profiles')
        .select('department, department_id, departments:departments!profiles_department_id_fkey(name)')
        .eq('role', 'student');

      if (!studentError && students) {
        const dist: Record<string, number> = {};
        students.forEach((s: any) => {
          // Prefer joined department name, then text column, then 'Unknown'
          const deptName =
            s.departments?.name ||
            s.department ||
            'Unknown';
          dist[deptName] = (dist[deptName] || 0) + 1;
        });
        stats.studentDistribution = Object.entries(dist)
          .filter(([name]) => name !== 'Unknown')
          .map(([name, value]) => ({ name, value }));

        // If filtering left nothing, include Unknown so chart has at least some data
        if (stats.studentDistribution.length === 0) {
          stats.studentDistribution = Object.entries(dist).map(([name, value]) => ({ name, value }));
        }
      }
    }

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('[dashboard/stats GET] Unhandled error:', error);
    const errorMessage = error?.message || String(error) || 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
