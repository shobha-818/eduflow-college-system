'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { supabaseSync } from '@/lib/supabase-sync';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate, getAttendanceColor } from '@/lib/utils-eduflow';
import { Plus, Filter, Download, TrendingUp, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
interface StudentStat {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
  status: 'good' | 'warning' | 'critical';
}

export default function AttendancePage() {
  const {
    currentUser,
    students,
    attendanceRecords,
    classes,
    subjects: allSubjects,
    departments,
    getVisibleAttendanceRecords,
  } = useAppStore();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [topicCovered, setTopicCovered] = useState('');
  const [attendanceData, setAttendanceData] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [showFilter, setShowFilter] = useState(false);
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [relevantStudents, setRelevantStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Live attendance statistics fetched directly from Supabase
  const [liveStats, setLiveStats] = useState<StudentStat[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Assigned classes / subjects for faculty
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<any[]>([]);

  // ── Fetch assigned classes for faculty ──────────────────────────────────────
  useEffect(() => {
    const loadAssignedClasses = async () => {
      if (currentUser?.role === 'faculty') {
        const { data: assignments } = await supabase
          .from('faculty_class_subjects')
          .select('class_id, subject_id')
          .eq('faculty_id', currentUser.id);

        const assignedClassIds = assignments?.map((a) => a.class_id) || [];
        const assignedSubjectIds = assignments?.map((a) => a.subject_id) || [];
        setAssignedClasses(classes.filter((c) => assignedClassIds.includes(c.id)));
        setAssignedSubjects(allSubjects.filter((s) => assignedSubjectIds.includes(s.id)));
      } else {
        setAssignedClasses(classes);
        setAssignedSubjects(allSubjects);
      }
    };

    if (classes.length > 0) loadAssignedClasses();
  }, [currentUser, classes, allSubjects]);

  const filteredClasses = assignedClasses.filter(
    (c) => currentUser?.role === 'principal' || c.departmentId === currentUser?.departmentId
  );
  const filteredSubjects = assignedSubjects.filter(
    (s) => currentUser?.role === 'principal' || s.departmentId === currentUser?.departmentId
  );

  // ── Live attendance statistics ───────────────────────────────────────────────
  const fetchAttendanceStats = useCallback(async () => {
    if (!currentUser) return;
    setLoadingStats(true);
    try {
      // Build the query — join profiles to get student name & department
      let query = supabase
        .from('attendance')
        .select(`
          id,
          student_id,
          status,
          student_profile:profiles!student_id (
            id,
            name,
            department
          )
        `);

      // Role-based filtering
      if (currentUser.role === 'student') {
        query = query.eq('student_id', currentUser.id);
      } else if (currentUser.role === 'faculty') {
        query = query.eq('faculty_id', currentUser.id);
      }
      // HOD / Principal see all (optionally scoped further after fetch)

      const { data, error } = await query;

      if (error) {
        console.error('[AttendanceStats] fetch error:', error.message);
        // Fallback: aggregate from in-memory store records
        buildStatsFromStore();
        return;
      }

      if (!data || data.length === 0) {
        // No DB records — fall back to store data
        buildStatsFromStore();
        return;
      }

      // Aggregate by student_id
      const agg: Record<string, StudentStat> = {};
      data.forEach((row: any) => {
        const sid = row.student_id;
        const profile = Array.isArray(row.student_profile)
          ? row.student_profile[0]
          : row.student_profile;

        if (!agg[sid]) {
          // Try to get roll number from in-memory store (profiles table may not have it)
          const storeStudent = students.find((s) => s.id === sid);
          agg[sid] = {
            id: sid,
            name: profile?.name || storeStudent?.name || 'Unknown',
            rollNumber: storeStudent?.rollNumber || 'N/A',
            department: profile?.department || storeStudent?.department || '',
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            percentage: 0,
            status: 'critical',
          };
        }
        agg[sid].total += 1;
        if (row.status === 'present') agg[sid].present += 1;
        else if (row.status === 'absent') agg[sid].absent += 1;
        else if (row.status === 'late') agg[sid].late += 1;
      });

      // Compute percentage & status badge
      const statsArray: StudentStat[] = Object.values(agg).map((s) => {
        const pct = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
        return {
          ...s,
          percentage: pct,
          status: pct >= 75 ? 'good' : pct >= 60 ? 'warning' : 'critical',
        };
      });

      // HOD filter by department
      const finalStats =
        currentUser.role === 'hod' && currentUser.department
          ? statsArray.filter((s) => s.department === currentUser.department)
          : statsArray;

      setLiveStats(finalStats.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('[AttendanceStats] unexpected error:', err);
      buildStatsFromStore();
    } finally {
      setLoadingStats(false);
    }
  }, [currentUser]);

  /** Fallback: build stats from in-memory store attendanceRecords */
  const buildStatsFromStore = useCallback(() => {
    const agg: Record<string, StudentStat> = {};
    const visible = getVisibleAttendanceRecords();

    visible.forEach((r: any) => {
      const sid = r.studentId || r.student_id;
      if (!sid) return;

      if (!agg[sid]) {
        const stu = students.find((s) => s.id === sid);
        agg[sid] = {
          id: sid,
          name: r.studentName || stu?.name || 'Unknown',
          rollNumber: stu?.rollNumber || 'N/A',
          department: stu?.department || '',
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          percentage: 0,
          status: 'critical',
        };
      }
      agg[sid].total += 1;
      if (r.status === 'present') agg[sid].present += 1;
      else if (r.status === 'absent') agg[sid].absent += 1;
      else if (r.status === 'late') agg[sid].late += 1;
    });

    const statsArray: StudentStat[] = Object.values(agg).map((s) => {
      const pct = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
      return { ...s, percentage: pct, status: pct >= 75 ? 'good' : pct >= 60 ? 'warning' : 'critical' };
    });

    setLiveStats(statsArray.sort((a, b) => a.name.localeCompare(b.name)));
    setLoadingStats(false);
  }, [getVisibleAttendanceRecords, students]);

  useEffect(() => {
    if (currentUser) fetchAttendanceStats();
  }, [currentUser, fetchAttendanceStats]);

  // Refresh stats after new attendance is saved
  const handleStatsRefresh = () => fetchAttendanceStats();

  // ── Load students for the selected class ────────────────────────────────────
  const loadAssignedStudents = useCallback(async () => {
    if (!selectedClassId) {
      setRelevantStudents([]);
      return;
    }
    setLoadingStudents(true);
    try {
      if (currentUser?.role === 'faculty') {
        const { data: assignments } = await supabase
          .from('faculty_class_subjects')
          .select('class_id')
          .eq('faculty_id', currentUser.id);
        const assignedClassIds = assignments?.map((a) => a.class_id) || [];
        if (!assignedClassIds.includes(selectedClassId)) {
          setRelevantStudents([]);
          toast.warning('You are not assigned to this class');
          setLoadingStudents(false);
          return;
        }
      }

      // Try with roll_number first, fall back without
      let enrolledData: any[] | null = null;
      const { data, error } = await supabase
        .from('student_class_enrollments')
        .select(`
          student_id,
          profiles:student_id (
            id, name, email, roll_number, department
          )
        `)
        .eq('class_id', selectedClassId);

      if (!error) {
        enrolledData = data;
      } else {
        const { data: data2, error: err2 } = await supabase
          .from('student_class_enrollments')
          .select(`
            student_id,
            profiles:student_id (
              id, name, email, department
            )
          `)
          .eq('class_id', selectedClassId);
        if (err2) throw err2;
        enrolledData = data2;
      }

      const mapped = (enrolledData ?? []).map((item: any) => {
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
        if (!profile) return null;
        const stu = students.find((s) => s.id === profile.id || s.email === profile.email);
        return {
          id: profile.id,
          name: profile.name || stu?.name || '',
          email: profile.email || stu?.email || '',
          rollNumber: profile.roll_number || stu?.rollNumber || 'N/A',
          roll_number: profile.roll_number || stu?.rollNumber || 'N/A',
          department: profile.department || stu?.department || '',
        };
      }).filter(Boolean);

      setRelevantStudents(mapped);
    } catch (err) {
      console.error('Error fetching students:', err);
      setRelevantStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedClassId, currentUser, students]);

  useEffect(() => {
    if (selectedClassId) loadAssignedStudents();
    else setRelevantStudents([]);
  }, [selectedClassId, loadAssignedStudents]);

  // ── Attendance marking ───────────────────────────────────────────────────────
  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendanceData((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    if (!selectedClassId) { toast.error('Please select a class'); return; }
    if (!selectedSubjectId) { toast.error('Please select a subject'); return; }
    if (!topicCovered.trim()) { toast.error('Please enter topic covered'); return; }
    if (Object.keys(attendanceData).length === 0) {
      toast.error('Please mark attendance for at least one student');
      return;
    }

    try {
      const recordsToSubmit = Object.entries(attendanceData).map(([studentId, status]) => {
        const student = relevantStudents.find((s) => s.id === studentId);
        const subject = allSubjects.find((s) => s.id === selectedSubjectId);
        return {
          student_id: studentId,
          student_name: student?.name || 'Unknown',
          attendance_date: selectedDate,
          status,
          subject: subject?.name || selectedSubjectId || 'Unknown',
          subject_id: selectedSubjectId || null,
          class_id: selectedClassId || null,
          department_id: currentUser?.departmentId || null,
          topic_covered: topicCovered,
          faculty_id: currentUser?.id || null,
          faculty_name: currentUser?.name || 'Faculty',
        };
      });

      await Promise.all(recordsToSubmit.map((record) => supabaseSync.addAttendance(record as any)));
      setAttendanceData({});
      setTopicCovered('');
      toast.success(`Attendance saved for ${recordsToSubmit.length} student(s)`);
      // Refresh stats to include the newly saved records
      await fetchAttendanceStats();
    } catch (error) {
      console.error('Attendance save error:', error);
      toast.error('Failed to save attendance');
    }
  };

  // ── Apply filters to live stats ──────────────────────────────────────────────
  const filteredStats = liveStats.filter((s) => {
    const deptMatch = filterDept === 'all' || s.department === filterDept;
    const statusMatch = filterStatus === 'all' || s.status === filterStatus;
    return deptMatch && statusMatch;
  });

  const visibleRecords = getVisibleAttendanceRecords();

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Attendance Insights</h1>
        <p className="text-muted-foreground">Attendance Data Capture &amp; Insights</p>
      </div>

      {/* Description Card */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <p className="text-sm text-foreground">
          Attendance data is used to generate reports, alerts, and academic insights. Faculty members
          can mark attendance and track topic coverage for each class session.
        </p>
      </Card>

      {/* Mark Attendance Section — Faculty Only */}
      {currentUser?.role === 'faculty' && (
        <Card className="p-6 space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Record Attendance &amp; Topics</h2>

          {/* Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
              >
                <option value="">Select Class</option>
                {filteredClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
              >
                <option value="">Select Subject</option>
                {filteredSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Topic Covered */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Topic Covered <span className="text-red-500">*</span>
            </label>
            <textarea
              value={topicCovered}
              onChange={(e) => setTopicCovered(e.target.value)}
              placeholder="e.g., Introduction to DBMS – Unit 1, SQL Queries, ER Diagrams"
              className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none min-h-20"
            />
            {!topicCovered.trim() && Object.keys(attendanceData).length > 0 && (
              <p className="text-sm text-red-500">Please enter topic covered</p>
            )}
          </div>

          {/* Student Grid */}
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">
                Students
                {loadingStudents && (
                  <span className="text-muted-foreground ml-2">(Loading...)</span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedClassId ? (
                  <span>Class: {classes.find((c) => c.id === selectedClassId)?.name}</span>
                ) : (
                  <span>Select a class to see students</span>
                )}
              </div>
              {!loadingStudents && relevantStudents.length === 0 && selectedClassId && (
                <span className="text-amber-500">No students assigned to this class</span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {loadingStudents ? (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  Loading students...
                </div>
              ) : (
                relevantStudents.map((student) => (
                  <div
                    key={student.id}
                    className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.rollNumber}</p>
                      </div>
                      <div className="flex gap-2">
                        {(['present', 'absent', 'late'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => handleAttendanceChange(student.id, status)}
                            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                              attendanceData[student.id] === status
                                ? status === 'present'
                                  ? 'bg-green-500 text-white'
                                  : status === 'absent'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-yellow-500 text-white'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            {status.charAt(0).toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={Object.keys(attendanceData).length === 0 || loadingStudents}
            className="w-full"
          >
            <Plus size={18} className="mr-2" />
            Mark Attendance ({Object.keys(attendanceData).length})
          </Button>
        </Card>
      )}

      {/* ── Attendance Statistics ── */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Attendance Statistics</h2>
            {liveStats.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {liveStats.length} student{liveStats.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleStatsRefresh}
              disabled={loadingStats}
              title="Refresh statistics"
            >
              <RefreshCw size={16} className={`mr-2 ${loadingStats ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowFilter(!showFilter)}>
              <Filter size={16} className="mr-2" />
              {showFilter ? 'Hide' : 'Show'} Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download size={16} className="mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filter Section */}
        {showFilter && (
          <div className="p-4 bg-muted/30 rounded-lg space-y-4 border border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Department</label>
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
                >
                  <option value="all">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="good">Good (≥75%)</option>
                  <option value="warning">At Risk (60-74%)</option>
                  <option value="critical">Critical (&lt;60%)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Summary Bar */}
        {!loadingStats && liveStats.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Good (≥75%)', color: 'bg-green-500', count: liveStats.filter(s => s.status === 'good').length },
              { label: 'At Risk (60-74%)', color: 'bg-yellow-500', count: liveStats.filter(s => s.status === 'warning').length },
              { label: 'Critical (<60%)', color: 'bg-red-500', count: liveStats.filter(s => s.status === 'critical').length },
            ].map(({ label, color, count }) => (
              <div key={label} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-bold text-foreground">{count}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Statistics Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-foreground">Student Name</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Roll Number</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Department</th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">Present / Total</th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">Attendance %</th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingStats ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin" />
                      Loading attendance statistics...
                    </div>
                  </td>
                </tr>
              ) : filteredStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <TrendingUp size={40} className="opacity-30" />
                      <p className="font-medium">No attendance records found</p>
                      <p className="text-xs opacity-60">
                        {currentUser?.role === 'faculty'
                          ? 'Mark attendance above to see statistics here.'
                          : 'Attendance data will appear here once faculty mark sessions.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStats.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-foreground font-medium">{student.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{student.rollNumber}</td>
                    <td className="py-3 px-4 text-muted-foreground">{student.department || '—'}</td>
                    <td className="py-3 px-4 text-center text-muted-foreground text-sm">
                      {student.present} / {student.total}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-bold ${getAttendanceColor(student.percentage)}`}>
                        {student.percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          student.status === 'good'
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : student.status === 'warning'
                            ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}
                      >
                        {student.status === 'good' ? 'Good' : student.status === 'warning' ? 'At Risk' : 'Critical'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Records */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Recent Attendance Records</h2>
        <p className="text-sm text-muted-foreground">
          Showing {visibleRecords.length} record(s) visible to your role
        </p>
        <div className="space-y-2">
          {visibleRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No attendance records found</div>
          ) : (
            visibleRecords
              .slice(-5)
              .reverse()
              .map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {(record as any).studentName || `Student: ${record.studentId}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {record.subject} • {formatDate(record.attendanceDate)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${
                      record.status === 'present'
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : record.status === 'absent'
                        ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                    }`}
                  >
                    {record.status.toUpperCase()}
                  </span>
                </div>
              ))
          )}
        </div>
      </Card>
    </div>
  );
}