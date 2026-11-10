'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ProfileItem {
  id: string;
  name: string;
  email: string;
  department?: string;
  roll_number?: string;
}

interface ClassItem {
  id: string;
  name: string;
  semester?: number;
  department_id?: string;
}

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  semester?: number;
  department_id?: string;
}

interface DepartmentItem {
  id: string;
  name: string;
  code?: string;
}

export default function AssignFacultyPage() {
  const [faculty, setFaculty] = useState<ProfileItem[]>([]);
  const [students, setStudents] = useState<ProfileItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'assign' | 'enroll'>('assign');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch faculty
    const { data: facultyData } = await supabase
      .from('profiles')
      .select('id, name, email, department')
      .in('role', ['faculty', 'hod']);
    setFaculty(facultyData || []);

    // Fetch classes
    const { data: classData } = await supabase.from('classes').select('*');
    setClasses(classData || []);

    // Fetch subjects
    const { data: subjectData } = await supabase.from('subjects').select('*');
    setSubjects(subjectData || []);

    // Fetch departments
    const { data: deptData } = await supabase.from('departments').select('*');
    setDepartments(deptData || []);
  };

  useEffect(() => {
    const fetchAvailableStudents = async () => {
      if (!selectedClass) {
        setStudents([]);
        return;
      }

      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('department_id, departments(name, code)')
        .eq('id', selectedClass)
        .single();

      if (classError) {
        console.error('[Enroll] Failed to load class:', classError);
        setStudents([]);
        return;
      }

      const deptId = classData?.department_id;
      const dept = classData?.departments as { name?: string; code?: string } | null;
      const deptName = dept?.name;
      const deptCode = dept?.code;

      if (!deptId && !deptName && !deptCode) {
        setStudents([]);
        return;
      }

      let query = supabase
        .from('profiles')
        .select('id, name, email, department, department_id')
        .eq('role', 'student');

      if (deptId && deptName) {
        query = query.or(
          `department_id.eq.${deptId},department.ilike.%${deptName}%,department.ilike.%${deptCode ?? deptName}%`
        );
      } else if (deptId) {
        query = query.eq('department_id', deptId);
      } else if (deptName) {
        query = query.or(`department.ilike.%${deptName}%,department.ilike.%${deptCode ?? deptName}%`);
      }

      const { data: profileStudents, error: profileError } = await query.order('name');

      if (profileError) {
        console.error('[Enroll] Failed to load students:', profileError);
        setStudents([]);
        return;
      }

      const rollByEmail = new Map<string, string>();
      if (deptId) {
        const { data: academicStudents } = await supabase
          .from('students')
          .select('email, roll_number')
          .eq('department_id', deptId);

        (academicStudents ?? []).forEach((s) => {
          if (s.email) rollByEmail.set(s.email.toLowerCase(), s.roll_number);
        });
      }

      const merged = (profileStudents ?? []).map((s) => ({
        ...s,
        roll_number: rollByEmail.get(s.email?.toLowerCase()) ?? undefined,
      }));

      setStudents(merged);
      setSelectedStudents([]);
    };

    fetchAvailableStudents();
  }, [selectedClass]);

  const handleAssignFaculty = async () => {
    if (!selectedFaculty || !selectedClass || !selectedSubject) {
      toast.error('Please select faculty, class, and subject');
      return;
    }

    setLoading(true);

    // Check if already assigned
    const { data: existing } = await supabase
      .from('faculty_class_subjects')
      .select('id')
      .eq('faculty_id', selectedFaculty)
      .eq('class_id', selectedClass)
      .eq('subject_id', selectedSubject)
      .maybeSingle();

    if (existing) {
      toast.error('This assignment already exists');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('faculty_class_subjects')
      .insert({
        faculty_id: selectedFaculty,
        class_id: selectedClass,
        subject_id: selectedSubject
      });

    if (error) {
      toast.error('Assignment failed: ' + error.message);
    } else {
      toast.success('Faculty assigned successfully!');
      setSelectedFaculty('');
      setSelectedClass('');
      setSelectedSubject('');
    }
    
    setLoading(false);
  };

  const handleEnrollStudents = async () => {
    if (!selectedClass) {
      toast.error('Please select a class');
      return;
    }
    
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setLoading(true);

    // Check for existing enrollments
    const { data: existing } = await supabase
      .from('student_class_enrollments')
      .select('student_id')
      .eq('class_id', selectedClass)
      .in('student_id', selectedStudents);

    const existingIds = existing?.map((e: any) => e.student_id) || [];
    const newStudents = selectedStudents.filter(id => !existingIds.includes(id));

    if (newStudents.length === 0) {
      toast.error('All selected students are already enrolled');
      setLoading(false);
      return;
    }

    const enrollments = newStudents.map(studentId => ({
      student_id: studentId,
      class_id: selectedClass
    }));

    const { error } = await supabase
      .from('student_class_enrollments')
      .insert(enrollments);

    if (error) {
      toast.error('Enrollment failed: ' + error.message);
    } else {
      toast.success(`${newStudents.length} student(s) enrolled successfully!`);
      setSelectedStudents([]);
      // Update the available students list by re-triggering the fetch logic.
      // This happens automatically if we temporarily unset and reset selectedClass,
      // but to be clean, we can just remove them from local state.
      setStudents(students.filter(s => !newStudents.includes(s.id)));
    }
    
    setLoading(false);
  };

  const toggleStudent = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Assign Faculty &amp; Students</h1>
        <p className="text-muted-foreground mt-1">
          Link faculty to classes/subjects and enroll students in classes for attendance
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('assign')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'assign'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Assign Faculty to Class &amp; Subject
        </button>
        <button
          onClick={() => setActiveTab('enroll')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'enroll'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Enroll Students in Class
        </button>
      </div>

      {/* Assign Faculty Tab */}
      {activeTab === 'assign' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Assign Faculty to Class &amp; Subject</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Faculty</label>
              <select
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
              >
                <option value="">-- Select Faculty --</option>
                {faculty.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.department || 'No Dept'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Select Class</label>
              <select
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">-- Select Class --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Select Subject</label>
              <select
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">-- Select Subject --</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <Button onClick={handleAssignFaculty} className="w-full" disabled={loading}>
              {loading ? 'Assigning...' : 'Assign Faculty'}
            </Button>
          </div>
        </Card>
      )}

      {/* Enroll Students Tab */}
      {activeTab === 'enroll' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Enroll Students in Class</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Class</label>
              <select
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">-- Select Class --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Select Students</label>
                {students.length > 0 && (
                  <button onClick={selectAllStudents} className="text-xs text-primary hover:underline">
                    {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
              <div className="border border-border rounded-lg max-h-60 overflow-y-auto p-2">
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No students found</p>
                ) : (
                  students.map(s => (
                    <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(s.id)}
                        onChange={() => toggleStudent(s.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{s.name}</span>
                      {s.roll_number && (
                        <span className="text-xs text-muted-foreground">({s.roll_number})</span>
                      )}
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Selected: {selectedStudents.length} student(s)</p>
            </div>

            <Button onClick={handleEnrollStudents} className="w-full" disabled={loading}>
              {loading ? 'Enrolling...' : `Enroll Selected Students (${selectedStudents.length})`}
            </Button>
          </div>
        </Card>
      )}

      {/* Instructions */}
      <Card className="p-4 border-primary/20 bg-primary/5">
        <h3 className="font-semibold mb-2">📌 How to test attendance:</h3>
        <ol className="text-sm space-y-1 text-muted-foreground list-decimal pl-4">
          <li>First, use <strong>Admin Setup</strong> page to create departments, classes, subjects, and students</li>
          <li>Then come here to <strong>assign faculty to class &amp; subject</strong></li>
          <li>Then <strong>enroll students in the same class</strong></li>
          <li>Now login as faculty and go to <strong>Attendance</strong> page</li>
          <li>Faculty will see only their assigned students</li>
        </ol>
      </Card>
    </div>
  );
}