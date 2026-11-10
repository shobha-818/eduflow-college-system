'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppStore } from '@/lib/store';
import { supabaseSync } from '@/lib/supabase-sync';
import { supabase } from '@/lib/supabase';
import { taskSchema, type TaskInput } from '@/lib/validation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, getTaskColor, getPriorityBg, sortByDate } from '@/lib/utils-eduflow';
import { UserSelect } from '@/components/UserSelect';
import { Controller } from 'react-hook-form';

const STATUSES = ['pending', 'in-progress', 'completed'] as const;

export default function TasksPage() {
  const { currentUser, tasks, addTask, updateTask, getVisibleTasks } = useAppStore();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      assignedTo: currentUser?.id || '',
      status: 'pending',
    },
  });

  // Get visible tasks based on role - filter by assigned user for faculty/students
  const visibleTasks = tasks.filter(task => {
    // Faculty and students only see tasks assigned to them
    if (currentUser?.role === 'faculty' || currentUser?.role === 'student') {
      return task.assignedTo === currentUser.id;
    }
    // Principal and HOD see all tasks
    return true;
  });
  const sortedTasks = sortByDate(visibleTasks);
  const filteredTasks = selectedStatus
    ? sortedTasks.filter((t) => t.status === selectedStatus)
    : sortedTasks;

  const onSubmit = async (data: TaskInput) => {
    try {
      const taskResult = await supabaseSync.addTask(data);

      // Send notification when task is assigned
      if (taskResult?.assigned_to) {
        await supabase.from('notifications').insert({
          user_id: taskResult.assigned_to,
          title: 'New Task Assigned',
          message: taskResult.title,
          type: 'task',
          link: '/dashboard/tasks',
          read: false
        });
      }

      toast.success('Task created successfully');
      reset();
      setIsAddingTask(false);
      // Refresh tasks after creating
      await useAppStore.getState().loadInitialData();
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to create task');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: typeof STATUSES[number]) => {
    try {
      await supabaseSync.updateTask(taskId, { status: newStatus });
      toast.success(`Task marked as ${newStatus}`);
      // Refresh tasks after updating
      await useAppStore.getState().loadInitialData();
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  // Fetch tasks on page load
  useEffect(() => {
    if (!currentUser) return;
    const fetchTasks = async () => {
      await useAppStore.getState().loadInitialData();
    };
    fetchTasks();
  }, [currentUser]);

  // Real-time subscription for task updates
  useEffect(() => {
    let channel: any = null;

    const setupRealtimeSubscription = async () => {
      try {
        if (!currentUser?.id) return;

        channel = supabase
          .channel(`tasks-${currentUser.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'tasks'
            },
            () => {
              // Refresh tasks when changes occur
              useAppStore.getState().loadInitialData();
            }
          );

        await channel.subscribe();
        console.log('✅ Realtime tasks subscription connected');
      } catch (error) {
        console.error('Error setting up realtime tasks:', error);
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
        console.log('🔌 Realtime tasks disconnected');
      }
    };
  }, [currentUser?.id]);

  // Group tasks by status
  const tasksByStatus = STATUSES.map((status) => ({
    status,
    tasks: filteredTasks.filter((t) => t.status === status),
  }));

  const stats = {
    pending: visibleTasks.filter((t) => t.status === 'pending').length,
    inProgress: visibleTasks.filter((t) => t.status === 'in-progress').length,
    completed: visibleTasks.filter((t) => t.status === 'completed').length,
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Tasks & Assignments</h1>
          <p className="text-muted-foreground">Track and manage academic tasks</p>
        </div>
        {currentUser?.role !== 'student' && (
          <Button onClick={() => setIsAddingTask(true)}>
            <Plus size={18} className="mr-2" />
            Create Task
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-warning mt-1">{stats.pending}</p>
            </div>
            <Clock className="text-warning/30" size={32} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-primary mt-1">{stats.inProgress}</p>
            </div>
            <AlertCircle className="text-primary/30" size={32} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-success mt-1">{stats.completed}</p>
            </div>
            <CheckCircle className="text-success/30" size={32} />
          </div>
        </Card>
      </div>

      {/* Add Task Form */}
      {isAddingTask && currentUser?.role !== 'student' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Create New Task</h2>
            <button
              onClick={() => {
                setIsAddingTask(false);
                reset();
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <input
                {...register('title')}
                placeholder="Task title"
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                {...register('description')}
                placeholder="Task description..."
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none resize-none"
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Due Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <input
                  {...register('dueDate')}
                  type="date"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                />
                {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <select
                  {...register('priority')}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                {errors.priority && <p className="text-xs text-destructive">{errors.priority.message}</p>}
              </div>

              {/* Assigned To */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign To</label>
                <Controller
                  name="assignedTo"
                  control={control}
                  render={({ field }) => (
                    <UserSelect
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select assignee..."
                    />
                  )}
                />
                {errors.assignedTo && <p className="text-xs text-destructive">{errors.assignedTo.message}</p>}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  {...register('status')}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                {errors.status && <p className="text-xs text-destructive">{errors.status.message}</p>}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">Create Task</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingTask(false);
                  reset();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedStatus === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedStatus('')}
        >
          All Tasks
        </Button>
        {STATUSES.map((status) => (
          <Button
            key={status}
            variant={selectedStatus === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStatus(status)}
          >
            {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Tasks by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {tasksByStatus.map((group) => (
          <div key={group.status} className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground capitalize">
                {group.status === 'in-progress' ? 'In Progress' : group.status}
              </h2>
              <span className="bg-muted text-muted-foreground text-sm font-semibold px-2 py-1 rounded">
                {group.tasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {group.tasks.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  No tasks
                </Card>
              ) : (
                group.tasks.map((task) => (
                  <Card
                    key={task.id}
                    className={`p-4 border-l-4 ${
                      task.priority === 'high'
                        ? 'border-l-destructive'
                        : task.priority === 'medium'
                        ? 'border-l-warning'
                        : 'border-l-primary'
                    }`}
                  >
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">{task.title}</h3>
                      <p className="text-xs text-muted-foreground">{task.description.substring(0, 60)}...</p>
                      <div className="flex flex-col gap-1">
                        <p className="text-xs text-primary font-medium">For: {task.assignedToName || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">By: {task.assignedByName || 'Admin'} • {formatDate(task.createdAt)}</p>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${getPriorityBg(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Due: {formatDate(task.dueDate)}
                        </span>
                      </div>

                      {/* Status Change Buttons */}
                      {task.status !== 'completed' && (
                        <div className="flex gap-1 pt-3">
                          {STATUSES.filter((s) => s !== task.status).map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(task.id, status)}
                              className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
                            >
                              {status === 'in-progress' ? 'Start' : 'Complete'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
