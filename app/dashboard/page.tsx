'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, Calendar, AlertCircle, TrendingUp, Clock, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ActivityFeed } from '@/components/activity-feed';
import { ApprovalsWidget } from '@/components/approvals-widget';
import { TasksSummary } from '@/components/tasks-summary';

const COLORS = ['#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#6366F1'];

export default function DashboardPage() {
  const { currentUser, students, tasks, leaves, announcements, timeSlots } = useAppStore();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');

        if (!res.ok) {
          // Safely parse error body — could be JSON or HTML (error page)
          const bodyText = await res.text();
          let bodyData: any = {};
          try { bodyData = JSON.parse(bodyText); } catch { bodyData = { raw: bodyText.slice(0, 200) }; }
          // Use console.warn instead of console.error to avoid Next.js Red Error Overlay for expected API failures like 401
          console.warn('Dashboard stats API error', {
            status: res.status,
            statusText: res.statusText,
            body: bodyData,
          });
          setStats(null);
          return;
        }

        const data = await res.json();
        setStats(data);
      } catch (error: any) {
        console.error('Failed to fetch dashboard stats:', error?.message || error);
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const activeLeavesCount = leaves.filter((l) => l.status === 'pending' || l.status === 'hod_approved').length;

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          College Overview Dashboard
        </h1>
        <p className="text-muted-foreground">
          Insights generated from academic, attendance, and workflow data. {currentUser?.role === 'principal' && '(Principal View)'}
          {currentUser?.role === 'hod' && 'Department Overview & Management'}
          {currentUser?.role === 'faculty' && 'Class & Student Management'}
          {currentUser?.role === 'student' && 'Your Academic Dashboard'}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total Students</p>
              <p className="text-3xl font-bold text-foreground mt-2">{students.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="text-primary" size={24} />
            </div>
          </div>
          {currentUser?.role !== 'student' && (
            <Link href="/dashboard/students">
              <Button variant="outline" className="w-full text-xs">
                View All
              </Button>
            </Link>
          )}
        </Card>

        {/* Active Classes */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Classes/Timetable</p>
              <p className="text-3xl font-bold text-foreground mt-2">{timeSlots.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="text-primary" size={24} />
            </div>
          </div>
          <Link href="/dashboard/timetable">
            <Button variant="outline" className="w-full text-xs">
              View Timetable
            </Button>
          </Link>
        </Card>

        {/* Pending Tasks */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Pending Tasks</p>
              <p className="text-3xl font-bold text-foreground mt-2">{pendingTasks}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="text-warning" size={24} />
            </div>
          </div>
          {currentUser?.role !== 'student' && (
            <Link href="/dashboard/tasks">
              <Button variant="outline" className="w-full text-xs">
                View Tasks
              </Button>
            </Link>
          )}
        </Card>

        {/* Pending Leaves */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Pending Leaves</p>
              <p className="text-3xl font-bold text-foreground mt-2">{activeLeavesCount}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="text-destructive" size={24} />
            </div>
          </div>
          {currentUser?.role !== 'student' && (
            <Link href="/dashboard/leaves">
              <Button variant="outline" className="w-full text-xs">
                Review Leaves
              </Button>
            </Link>
          )}
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Weekly Attendance Trend</h2>
            <TrendingUp className="text-muted-foreground" size={20} />
          </div>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.attendanceTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} unit="%" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar name="Present %" dataKey="present" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                <Bar name="Absent %" dataKey="absent" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Department Distribution */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Student Distribution</h2>
            <Users className="text-muted-foreground" size={20} />
          </div>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (stats?.studentDistribution?.length ?? 0) === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Users size={40} className="opacity-30" />
              <p className="text-sm">No student data available</p>
              <p className="text-xs opacity-60">Ensure students have a department assigned</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.studentDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }: { name: string; percent: number }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                  labelLine={true}
                >
                  {(stats?.studentDistribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any, name: any) => [`${value} students`, name]}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Announcements */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Recent Announcements</h2>
            <Link href="/dashboard/announcements">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
          <div className="space-y-3">
            {announcements.slice(0, 3).map((announcement) => (
              <div
                key={announcement.id}
                className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{announcement.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{announcement.content.substring(0, 60)}...</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${
                    announcement.priority === 'high'
                      ? 'bg-destructive/10 text-destructive'
                      : announcement.priority === 'medium'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {announcement.priority.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
            {announcements.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No announcements found</p>
            )}
          </div>
        </Card>

        {/* Upcoming Events */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Upcoming Events</h2>
            <Link href="/dashboard/events">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { title: 'Annual Tech Summit 2024', date: '2024-05-15', location: 'Main Auditorium' },
              { title: 'Inter-Department Sports Day', date: '2024-05-20', location: 'College Grounds' },
              { title: 'Python Workshop', date: '2024-05-10', location: 'Lab 3' },
            ].slice(0, 3).map((event, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{event.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      <Calendar className="inline mr-1" size={14} />
                      {event.date} • {event.location}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Weekly Teaching Summary (Faculty Only) */}
      {currentUser?.role === 'faculty' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                📘 Weekly Teaching Summary
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Your teaching activity this week</p>
            </div>
            <Link href="/dashboard/attendance">
              <Button variant="outline" size="sm">Mark Attendance</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-muted/30">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Classes Taken</p>
                <p className="text-3xl font-bold text-foreground">4</p>
              </div>
            </Card>
            <Card className="p-4 bg-muted/30">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Avg Attendance</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">82%</p>
              </div>
            </Card>
            <Card className="p-4 bg-muted/30">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Topics Covered</p>
                <p className="text-3xl font-bold text-primary">6</p>
              </div>
            </Card>
          </div>
          <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium text-foreground mb-3">Topics Covered This Week:</p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">• Introduction to DBMS – Unit 1</p>
              <p className="text-sm text-muted-foreground">• SQL Queries and Operations</p>
              <p className="text-sm text-muted-foreground">• ER Diagram Modeling</p>
              <p className="text-sm text-muted-foreground">• Database Normalization</p>
              <p className="text-sm text-muted-foreground">• Practical Lab Session</p>
              <p className="text-sm text-muted-foreground">• Assessment Discussion</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tasks Summary Section */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6">Task Management</h2>
        <TasksSummary />
      </div>

      {/* Activity Feed & Approvals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
        <div>
          {(currentUser?.role === 'principal' || currentUser?.role === 'hod') && (
            <ApprovalsWidget />
          )}
        </div>
      </div>
    </div>
  );
}

