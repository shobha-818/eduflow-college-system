'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Download, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

export default function AttendanceReportPage() {
  const { currentUser, students, attendanceRecords, getAttendancePercentage } = useAppStore();

  const [deptFilter, setDeptFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');

  // Filter students based on criteria
  const filteredStudents = students.filter((s) => {
    const deptMatch = deptFilter === 'all' || s.department === deptFilter;
    const semMatch = semesterFilter === 'all' || s.semester.toString() === semesterFilter;
    return deptMatch && semMatch;
  });

  // Calculate attendance stats
  const attendanceStats = filteredStudents.map((student) => ({
    ...student,
    percentage: getAttendancePercentage(student.id),
    status: getAttendancePercentage(student.id) >= 75 ? 'good' : 'shortage',
  }));

  const avgAttendance = Math.round(
    attendanceStats.reduce((sum, s) => sum + s.percentage, 0) / (attendanceStats.length || 1)
  );

  const lowAttendanceStudents = attendanceStats.filter((s) => s.percentage < 75);

  // Weekly trend data
  const weeklyData = [
    { week: 'Week 1', attendance: 82 },
    { week: 'Week 2', attendance: 21},
    { week: 'Week 3', attendance: 75 },
    { week: 'Week 4', attendance: 72 },
  ];

  // Student wise attendance (top 5)
  const studentWiseData = attendanceStats
    .slice(0, 5)
    .map((s) => ({ name: s.name.split(' ')[0], attendance: s.percentage }));

  const handleExportCSV = () => {
    try {
      let csv = 'Student Name,Roll Number,Department,Semester,Attendance %,Status\n';
      attendanceStats.forEach((student) => {
        csv += `${student.name},${student.rollNumber},${student.department},${student.semester},${student.percentage}%,${student.status}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Attendance report exported');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const departments = Array.from(new Set(students.map((s) => s.department)));
  const semesters = Array.from(new Set(students.map((s) => s.semester))).sort();

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Attendance Reports</h1>
        <p className="text-muted-foreground">Detailed student-level attendance analytics and alerts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Average Attendance</p>
            <p className="text-3xl font-bold text-foreground">{avgAttendance}%</p>
            <p className="text-xs text-muted-foreground mt-2">
              {filteredStudents.length > 0 ? `${filteredStudents.length} students` : 'No data'}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Students</p>
            <p className="text-3xl font-bold text-foreground">{filteredStudents.length}</p>
            <p className="text-xs text-muted-foreground mt-2">Tracked</p>
          </div>
        </Card>

        <Card className="p-6 border-red-200 dark:border-red-900">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              Below 75%
            </p>
            <p className="text-3xl font-bold text-red-500">{lowAttendanceStudents.length}</p>
            <p className="text-xs text-muted-foreground mt-2">Students at risk</p>
          </div>
        </Card>
      </div>

      {/* Filters and Export */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Filters</h2>
            <Button onClick={handleExportCSV} size="sm">
              <Download size={16} className="mr-2" />
              Download Report (CSV)
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Department</label>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Semester</label>
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none"
              >
                <option value="all">All Semesters</option>
                {semesters.map((sem) => (
                  <option key={sem} value={sem.toString()}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Weekly Attendance Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="attendance" stroke="var(--primary)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Student-wise Attendance */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Student-wise Attendance (Top 5)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={studentWiseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="attendance" fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Low Attendance Alerts */}
      {lowAttendanceStudents.length > 0 && (
        <Card className="p-6 border-red-200 dark:border-red-900">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" />
            Low Attendance Alerts
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {lowAttendanceStudents.length} student{lowAttendanceStudents.length !== 1 ? 's' : ''} below 75% threshold
          </p>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {lowAttendanceStudents.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">{student.name}</p>
                  <p className="text-sm text-muted-foreground">{student.rollNumber} • {student.department}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-red-500">{student.percentage}%</span>
                  <Badge variant="destructive">Shortage</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Attendance Table */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Student Attendance Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-foreground">Student Name</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Roll Number</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Department</th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">Semester</th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">Attendance %</th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceStats.length > 0 ? (
                attendanceStats.map((student) => (
                  <tr
                    key={student.id}
                    className={`border-b transition-colors ${
                      student.percentage < 75 
                        ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900' 
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <td className="py-3 px-4 text-foreground font-medium">{student.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{student.rollNumber}</td>
                    <td className="py-3 px-4 text-muted-foreground">{student.department}</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">{student.semester}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-bold ${
                          student.percentage >= 75
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {student.percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        className={
                          student.status === 'good'
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }
                      >
                        {student.status === 'good' ? 'Good' : 'Shortage'}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No attendance data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
