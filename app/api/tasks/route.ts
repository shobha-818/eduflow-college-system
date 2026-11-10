import { createClient, getServerProfile } from '@/lib/supabase-api';
import { notifyTaskAssigned } from '@/lib/notifications';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // profile is fetched but used for future filtering; currently returns all tasks
    await getServerProfile(supabase, user, 'department, department_id, role');

    const safeTaskSelect = `id,title,description,assigned_to,assigned_by,status,deadline,due_date,priority,created_by,created_at`;

    let query = supabase.from('tasks').select(`
      *,
      assigned_to_profile:profiles!assigned_to(name),
      assigned_by_profile:profiles!assigned_by(name)
    `).order('created_at', { ascending: false });

    const { data, error } = await query;
    
    if (error && (error.message.includes('reference') || error.message.includes('schema cache') || error.message.includes("Could not find the 'department'"))) {
       const simpleQuery = await supabase.from('tasks').select(safeTaskSelect).order('created_at', { ascending: false });
       if (simpleQuery.error) return NextResponse.json({ error: simpleQuery.error.message }, { status: 400 });
       
       const profileIds = [...new Set([...simpleQuery.data.map((t: any) => t.assigned_to), ...simpleQuery.data.map((t: any) => t.assigned_by)])].filter(Boolean);
       const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', profileIds);
       
       const flattened = simpleQuery.data.map((task: any) => {
         const assignedTo = profiles?.find(p => p.id === task.assigned_to);
         const assignedBy = profiles?.find(p => p.id === task.assigned_by);
         return {
           ...task,
           assigned_to_name: assignedTo?.name || 'Unknown',
           assigned_by_name: assignedBy?.name || 'Unknown'
         };
       });
       return NextResponse.json(flattened);
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const flattened = data.map((task: any) => ({
      ...task,
      assigned_to_name: task.assigned_to_profile?.name || 'Unknown',
      assigned_by_name: task.assigned_by_profile?.name || 'Unknown'
    }));

    return NextResponse.json(flattened);
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
    const profile = await getServerProfile(supabase, user, 'id, name, department, department_id, role');

    if (!profile || !['principal', 'hod', 'faculty'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const taskData: any = {
      ...body,
      assigned_by: user.id
    };

    const department = profile.department || body.department;
    if (department) {
      taskData.department = department;
    }

    let insertResult = await supabase.from('tasks').insert([taskData]).select().single();
    if (insertResult.error && insertResult.error.message.includes("Could not find the 'department' column")) {
      delete taskData.department;
      insertResult = await supabase.from('tasks').insert([taskData]).select().single();
    }

    if (insertResult.error) return NextResponse.json({ error: insertResult.error.message }, { status: 400 });
    const data = insertResult.data;

    if (data.assigned_to) {
      await notifyTaskAssigned(supabase, {
        taskId: data.id,
        assignedTo: data.assigned_to,
        title: data.title,
        dueDate: data.deadline || data.due_date,
        assignedByName: profile.name
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
