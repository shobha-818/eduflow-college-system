'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Database, 
  Users, 
  BookOpen, 
  Building2, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function AdminSetupPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (name: string, fn: () => Promise<void>) => {
    setLoading(name);
    try {
      await fn();
      toast.success(`${name} completed successfully`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || `Failed to ${name}`);
    } finally {
      setLoading(null);
    }
  };

  // 1. Create Departments
  const seedDepartments = async () => {
    const departments = [
      { name: 'Computer Science', code: 'CS' },
      { name: 'Mechanical Engineering', code: 'ME' },
      { name: 'Electronics Engineering', code: 'ECE' }
    ];

    for (const dept of departments) {
      const { error } = await supabase
        .from('departments')
        .upsert(dept, { onConflict: 'code' });
      if (error) throw error;
    }
  };

  // 2. Create Classes
  const seedClasses = async () => {
    const { data: depts } = await supabase.from('departments').select('id, name');
    if (!depts?.length) throw new Error('Please create departments first');

    for (const dept of depts) {
      const className = `${dept.name} - Semester 3`;
      const { error } = await supabase
        .from('classes')
        .insert([{ 
          name: className, 
          department_id: dept.id, 
          semester: 3 
        }]);
      // We don't throw on error here in case it already exists (insert vs upsert)
      if (error && !error.message.includes('unique')) console.warn(error);
    }
  };

  // 3. Create Subjects
  const seedSubjects = async () => {
    const { data: depts } = await supabase.from('departments').select('id, code');
    if (!depts?.length) throw new Error('Please create departments first');

    const subjects = [
      { name: 'Database Management Systems', code: 'CS301', semester: 3 },
      { name: 'Operating Systems', code: 'CS302', semester: 3 },
      { name: 'Thermodynamics', code: 'ME301', semester: 3 }
    ];

    for (const sub of subjects) {
      const dept = depts.find(d => sub.code.startsWith(d.code));
      if (!dept) continue;

      const { error } = await supabase
        .from('subjects')
        .upsert({ 
          ...sub, 
          department_id: dept.id 
        }, { onConflict: 'code' });
      if (error) throw error;
    }
  };

  // 4. Create Students
  const seedStudents = async () => {
    const { data: classes } = await supabase.from('classes').select('id, name, semester, department_id');
    const { data: depts } = await supabase.from('departments').select('id, name');
    
    if (!classes?.length) throw new Error('Please create classes first');

    const names = ['John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Wilson', 'Charlie Brown'];
    
    for (const name of names) {
      const randomClass = classes[Math.floor(Math.random() * classes.length)];
      const deptName = depts?.find(d => d.id === randomClass.department_id)?.name || 'General';
      
      const { error } = await supabase
        .from('students')
        .insert([{
          name,
          email: `${name.toLowerCase().replace(' ', '.')}@student.edu`,
          roll_number: `ROLL-${Math.floor(1000 + Math.random() * 9000)}`,
          department: deptName,
          department_id: randomClass.department_id,
          class_id: randomClass.id,
          semester: randomClass.semester,
          gpa: (3.0 + Math.random()).toFixed(2)
        }]);
      if (error && !error.message.includes('unique')) console.warn(error);
    }
  };

  // 5. Assign Current User as Faculty for Testing
  const promoteToFaculty = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be logged in');

    const { error } = await supabase
      .from('profiles')
      .update({ role: 'faculty' })
      .eq('id', user.id);
    
    if (error) throw error;
    
    // Also assign to a subject
    const { data: subject } = await supabase.from('subjects').select('id').limit(1).single();
    if (subject) {
      await supabase.from('subjects').update({ faculty_id: user.id }).eq('id', subject.id);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4 border-b pb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Database className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Admin System Setup</h1>
          <p className="text-muted-foreground">Quickly seed your database with test data and configure roles.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Infrastructure Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <Building2 className="w-5 h-5 text-blue-500" />
            Infrastructure
          </div>
          <p className="text-sm text-muted-foreground">Set up the core organizational units of the college.</p>
          <div className="grid gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleAction('Create Departments', seedDepartments)}
              disabled={!!loading}
              className="justify-start gap-2"
            >
              {loading === 'Create Departments' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              1. Seed Departments (CS, ME, ECE)
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleAction('Create Classes', seedClasses)}
              disabled={!!loading}
              className="justify-start gap-2"
            >
              {loading === 'Create Classes' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              2. Seed Semester Classes
            </Button>
          </div>
        </Card>

        {/* Academic Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <BookOpen className="w-5 h-5 text-green-500" />
            Academics
          </div>
          <p className="text-sm text-muted-foreground">Define subjects and curricula for the departments.</p>
          <div className="grid gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleAction('Create Subjects', seedSubjects)}
              disabled={!!loading}
              className="justify-start gap-2"
            >
              {loading === 'Create Subjects' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              3. Seed Subjects (DBMS, OS...)
            </Button>
          </div>
        </Card>

        {/* People Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <Users className="w-5 h-5 text-purple-500" />
            Users & Students
          </div>
          <p className="text-sm text-muted-foreground">Populate the system with students and assign roles.</p>
          <div className="grid gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleAction('Create Students', seedStudents)}
              disabled={!!loading}
              className="justify-start gap-2"
            >
              {loading === 'Create Students' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              4. Seed Sample Students
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleAction('Self-Promote to Faculty', promoteToFaculty)}
              disabled={!!loading}
              className="justify-start gap-2"
            >
              {loading === 'Self-Promote to Faculty' ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
              5. Make ME Faculty & Assign Subject
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleAction('Self-Promote to HOD', async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('You must be logged in');
                const { error } = await supabase.from('profiles').update({ role: 'hod' }).eq('id', user.id);
                if (error) throw error;
              })}
              disabled={!!loading}
              className="justify-start gap-2"
            >
              {loading === 'Self-Promote to HOD' ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4 text-orange-500" />}
              6. Make ME HOD
            </Button>
          </div>
        </Card>

        {/* Status Card */}
        <Card className="p-6 bg-muted/30 border-dashed flex flex-col justify-center items-center text-center space-y-2">
          <div className="p-3 bg-background rounded-full border">
            <AlertCircle className="w-6 h-6 text-orange-500" />
          </div>
          <div className="font-medium">Setup Guide</div>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Run these steps in order (1 to 5) to ensure all relational links are correctly established.
          </p>
        </Card>
      </div>

      <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg flex gap-3 text-orange-800">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold">Important Note:</p>
          <p>This page is for development and testing. It allows you to quickly populate the system without manual SQL entry. Ensure you have run the latest <strong>SCHEMA_SYNC_FIX.sql</strong> before using these buttons.</p>
        </div>
      </div>
    </div>
  );
}
