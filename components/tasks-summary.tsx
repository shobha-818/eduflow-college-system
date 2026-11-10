'use client';

import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Clock, ListTodo } from 'lucide-react';
import Link from 'next/link';

export function TasksSummary() {
  const { getTaskStats, getOverdueTasks, getVisibleTasks } = useAppStore();
  const stats = getTaskStats();
  const overdueTasks = getOverdueTasks();
  const visibleTasks = getVisibleTasks();

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Task Progress Card */}
      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Task Progress</h2>

          <div className="space-y-3">
            {/* Completion Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Completion Rate</span>
                <span className="text-sm font-bold text-foreground">{completionRate}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                <p className="text-xs text-muted-foreground mb-1">Pending</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.pending}</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                <p className="text-xs text-muted-foreground mb-1">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.inProgress}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                <p className="text-xs text-muted-foreground mb-1">Completed</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950">
                <p className="text-xs text-muted-foreground mb-1">Overdue</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p>
              </div>
            </div>
          </div>

          <Link href="/dashboard/tasks">
            <Button variant="outline" className="w-full">View All Tasks</Button>
          </Link>
        </div>
      </Card>

      {/* Overdue Tasks Alert */}
      {overdueTasks.length > 0 && (
        <Card className="p-6 border-red-200 dark:border-red-800">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
              <h2 className="text-lg font-semibold text-foreground">Overdue Tasks</h2>
              <span className="text-sm font-bold bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded-full ml-auto">
                {overdueTasks.length}
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {overdueTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
                  <p className="font-medium text-red-900 dark:text-red-100 text-sm">{task.title}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-red-700 dark:text-red-300">
                    <Clock size={14} />
                    <span>Due: {task.deadline}</span>
                  </div>
                </div>
              ))}
            </div>

            {overdueTasks.length > 5 && (
              <p className="text-sm text-muted-foreground text-center">+{overdueTasks.length - 5} more overdue tasks</p>
            )}

            <Link href="/dashboard/tasks">
              <Button variant="default" className="w-full">Review Overdue Tasks</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* No Overdue Tasks */}
      {overdueTasks.length === 0 && stats.total > 0 && (
        <Card className="p-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-green-600 dark:text-green-400" size={20} />
              <h2 className="text-lg font-semibold text-foreground">All Tasks on Track</h2>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              Great job! No overdue tasks. You have {stats.total} task{stats.total !== 1 ? 's' : ''} in progress.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
