'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2, Plus, Users, BookOpen } from 'lucide-react';

interface Faculty {
  id: string;
  name: string;
  email: string;
  department?: string;
  department_id?: string;
  roll_number?: string;
  semester?: number;
}

interface StudentItem extends Faculty {
  isEnrolled?: boolean;
}
interface ClassItem {
  id: string;
  name: string;
  semester: number;
  department_id?: string;
}

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  semester: number;
  department_id?: string;
}

interface Assignment {
  id: string;
  faculty_id: string;
  class_id: string;
  subject_id: string;
  created_at: string;
  faculty_name?: string;
  class_name?: string;
  subject_name?: string;
}

interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  enrollment_date: string;
  student_name?: string;
  class_name?: string;
}

export default function AssignFacultyPage() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  // `allStudents` holds the full student list (for name lookups).
  const [allStudents, setAllStudents] = useState<Faculty[]>([]);
  // `students` holds the currently-displayed students for the selected class
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Faculty assignment form
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Student enrollment form
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedEnrollClass, setSelectedEnrollClass] = useState('');

  // Active tab
  const [activeTab, setActiveTab] = useState<'assign' | 'enroll'>('assign');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load faculty (role = faculty or hod)
      const { data: facultyData } = await supabase
        .from('profiles')
        .select('id, name, email, department')
        .in('role', ['faculty', 'hod'])
        .order('name');

      // Load students (role = student). Keep full list in `allStudents` for lookups.
      const { data: studentData } = await supabase
        .from('profiles')
        .select('id, name, email, department, department_id, roll_number, semester')
        .eq('role', 'student')
        .order('name');

      // Load classes
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name, semester, department_id')
        .order('name');

      // Load subjects
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('id, name, code, semester, department_id')
        .order('name');

      setFaculty(facultyData || []);
      setAllStudents(studentData || []);
      // Do not show all students by default in the enroll tab — wait for class selection
      setStudents([]);
      setClasses(classData || []);
      setSubjects(subjectData || []);

      await loadAssignments();
      await loadEnrollments();
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function loadAssignments() {
    const { data, error } = await supabase
      .from('faculty_class_subjects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.warn('faculty_class_subjects table does not exist yet. Run the SQL migration.');
        setAssignments([]);
        return;
      }
      console.error('Error loading assignments:', error);
      return;
    }

    setAssignments(data || []);
  }

  async function loadEnrollments() {
    const { data, error } = await supabase
      .from('student_class_enrollments')
      .select('*')
      .order('enrollment_date', { ascending: false });

    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.warn('student_class_enrollments table does not exist yet. Run the SQL migration.');
        setEnrollments([]);
        return;
      }
      console.error('Error loading enrollments:', error);
      return;
    }

    setEnrollments(data || []);
  }

  async function handleAssignFaculty() {
    if (!selectedFaculty || !selectedClass || !selectedSubject) {
      toast.error('Please select faculty, class, and subject');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('faculty_class_subjects')
        .insert([{
          faculty_id: selectedFaculty,
          class_id: selectedClass,
          subject_id: selectedSubject,
        }]);

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          toast.error('This assignment already exists');
        } else {
          throw error;
        }
      } else {
        toast.success('Faculty assigned successfully');
        setSelectedFaculty('');
        setSelectedClass('');
        setSelectedSubject('');
        await loadAssignments();
      }
    } catch (error: any) {
      console.error('Assign error:', error);
      toast.error(error.message || 'Failed to assign faculty');
    } finally {
      setSaving(false);
    }
  }

  async function handleEnrollStudent() {
    if (!selectedStudent || !selectedEnrollClass) {
      toast.error('Please select student and class');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('student_class_enrollments')
        .insert([{
          student_id: selectedStudent,
          class_id: selectedEnrollClass,
        }]);

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          toast.error('This student is already enrolled in this class');
        } else {
          throw error;
        }
      } else {
        toast.success('Student enrolled successfully');
        setSelectedStudent('');
        setSelectedEnrollClass('');
        await loadEnrollments();
      }
    } catch (error: any) {
      console.error('Enroll error:', error);
      toast.error(error.message || 'Failed to enroll student');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAssignment(id: string) {
    try {
      const { error } = await supabase
        .from('faculty_class_subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Assignment removed');
      await loadAssignments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove assignment');
    }
  }

  async function handleDeleteEnrollment(id: string) {
    try {
      const { error } = await supabase
        .from('student_class_enrollments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Enrollment removed');
      await loadEnrollments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove enrollment');
    }
  }

  // Helper to get names from IDs
  const getFacultyName = (id: string) => faculty.find(f => f.id === id)?.name || 'Unknown';
  const getClassName = (id: string) => classes.find(c => c.id === id)?.name || 'Unknown';
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || 'Unknown';
  const getStudentName = (id: string) => {
    const fromAll = allStudents.find(s => s.id === id);
    if (fromAll) return fromAll.name;
    const fromShown = students.find(s => s.id === id);
    return fromShown?.name || 'Unknown';
  };

  // Fetch ONLY students enrolled in the selected class
  const fetchStudentsForClass = async () => {
    if (!selectedEnrollClass) {
      setStudents([]);
      return;
    }

    console.log('Fetching students for class:', selectedEnrollClass);

    // Get students enrolled in THIS SPECIFIC CLASS
    const { data: enrolledData, error } = await supabase
      .from('student_class_enrollments')
      .select(`
        student_id,
        profiles:student_id (
          id,
          name,
          email,
          roll_number,
          department_id
        )
      `)
      .eq('class_id', selectedEnrollClass);

    if (error) {
      console.error('Error fetching enrollments:', error);
      setStudents([]);
      return;
    }

    // Extract student details
    const enrolledStudents: StudentItem[] = enrolledData?.map((item: any) => ({
      id: item.profiles.id,
      name: item.profiles.name,
      email: item.profiles.email,
      roll_number: item.profiles.roll_number,
      department_id: item.profiles.department_id,
      isEnrolled: true,
    })) || [];

    console.log('Enrolled students:', enrolledStudents);
    setStudents(enrolledStudents);
  };

  useEffect(() => {
    if (selectedEnrollClass) fetchStudentsForClass();
    else setStudents([]);
  }, [selectedEnrollClass]);


  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Assign Faculty &amp; Enroll Students</h1>
        <p className="text-muted-foreground">
          Manage faculty-class-subject assignments and student enrollments
        </p>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'assign' ? 'default' : 'outline'}
          onClick={() => setActiveTab('assign')}
        >
          <BookOpen size={18} className="mr-2" />
          Faculty Assignments
        </Button>
        <Button
          variant={activeTab === 'enroll' ? 'default' : 'outline'}
          onClick={() => setActiveTab('enroll')}
        >
          <Users size={18} className="mr-2" />
          Student Enrollments
        </Button>
      </div>

      {/* Faculty Assignment Tab */}
      {activeTab === 'assign' && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Plus size={20} />
              Assign Faculty to Class &amp; Subject
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Faculty Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Faculty</label>
                <select
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                >
                  <option value="">Select Faculty</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.department ? `(${f.department})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Sem {c.semester})
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              onClick={handleAssignFaculty}
              disabled={saving || !selectedFaculty || !selectedClass || !selectedSubject}
            >
              {saving ? 'Assigning...' : 'Assign Faculty'}
            </Button>
          </Card>

          {/* Current Assignments */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Current Assignments</h2>
            {assignments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No faculty assignments yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Faculty</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Class</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Subject</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => (
                      <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-sm">{getFacultyName(a.faculty_id)}</td>
                        <td className="py-3 px-4 text-sm">{getClassName(a.class_id)}</td>
                        <td className="py-3 px-4 text-sm">{getSubjectName(a.subject_id)}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAssignment(a.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Student Enrollment Tab */}
      {activeTab === 'enroll' && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Plus size={20} />
              Select Class to View Enrolled Students
            </h2>

            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <select
                value={selectedEnrollClass}
                onChange={(e) => setSelectedEnrollClass(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Sem {c.semester})
                  </option>
                ))}
              </select>
            </div>

            {/* Enrolled Students List */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Enrolled Students</label>
              <div className="max-h-96 overflow-y-auto border border-border rounded-md p-4 bg-card">
                {students.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {selectedEnrollClass ? (
                      <>
                        <div>No students enrolled in this class yet.</div>
                        <div className="text-xs mt-2">Add students using the database or API.</div>
                      </>
                    ) : (
                      'Select a class to view enrolled students'
                    )}
                  </p>
                ) : (
                  students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between gap-4 p-3 border-b border-border/50 last:border-0 hover:bg-muted/30"
                    >
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {student.email}
                          {student.roll_number ? ` • ${student.roll_number}` : ''}
                        </div>
                      </div>
                      <div className="text-xs text-green-600 font-medium">✅ Enrolled</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Faculty Members</p>
          <p className="text-2xl font-bold text-primary mt-2">{faculty.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Classes</p>
          <p className="text-2xl font-bold text-primary mt-2">{classes.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Assignments</p>
          <p className="text-2xl font-bold text-primary mt-2">{assignments.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Enrollments</p>
          <p className="text-2xl font-bold text-primary mt-2">{enrollments.length}</p>
        </Card>
      </div>
    </div>
  );
}
