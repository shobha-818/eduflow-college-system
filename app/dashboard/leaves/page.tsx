'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppStore } from '@/lib/store';
import { supabaseSync } from '@/lib/supabase-sync';
import { supabase } from '@/lib/supabase';
import { leaveSchema, type LeaveInput } from '@/lib/validation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, calculateDuration, getLeaveStatus } from '@/lib/utils-eduflow';

export default function LeavesPage() {
  const { currentUser, leaves, applyLeave, updateLeaveStatus } = useAppStore();
  const [isApplyingLeave, setIsApplyingLeave] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<LeaveInput>({
    resolver: zodResolver(leaveSchema),
  });

  const filteredLeaves = selectedStatus
    ? leaves.filter((l) => l.status === selectedStatus)
    : leaves;

  const onSubmit = async (data: LeaveInput) => {
    try {
      const leaveData = {
        ...data,
        applicant_id: currentUser?.id || '',
        applicant_name: currentUser?.name || 'Unknown',
        department: currentUser?.department || null,
        status: 'pending' as const,
      };
      await supabaseSync.applyLeave(leaveData as any);
      toast.success('Leave application submitted successfully');
      reset();
      setIsApplyingLeave(false);
      // Refresh leaves after applying
      await useAppStore.getState().loadInitialData();
    } catch (error) {
      console.error('Leave application error:', error);
      toast.error('Failed to submit leave application');
    }
  };

  const handleUpdateStatus = async (id: string, action: 'approve' | 'reject') => {
    try {
      await supabaseSync.updateLeaveStatus(id, action);
      toast.success(`Leave ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      // Refresh leaves after status update
      await useAppStore.getState().loadInitialData();
    } catch (error) {
      toast.error(`Failed to process leave`);
    }
  };

  // Fetch leaves on page load
  useEffect(() => {
    if (!currentUser) return;
    const fetchLeaves = async () => {
      await useAppStore.getState().loadInitialData();
    };
    fetchLeaves();
  }, [currentUser]);

  // Real-time subscription for leave updates
  useEffect(() => {
    let channel: any = null;

    const setupRealtimeSubscription = async () => {
      try {
        if (!currentUser?.id) return;

        channel = supabase
          .channel(`leaves-${currentUser.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'leaves'
            },
            () => {
              // Refresh leaves when changes occur
              useAppStore.getState().loadInitialData();
            }
          );

        await channel.subscribe();
        console.log('✅ Realtime leaves subscription connected');
      } catch (error) {
        console.error('Error setting up realtime leaves:', error);
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
        console.log('🔌 Realtime leaves disconnected');
      }
    };
  }, [currentUser?.id]);

  const stats = {
    pending: leaves.filter((l) => l.status === 'pending' || l.status === 'hod_approved').length,
    approved: leaves.filter((l) => l.status === 'approved').length,
    rejected: leaves.filter((l) => l.status === 'rejected').length,
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Leave Management</h1>
          <p className="text-muted-foreground">Apply and manage leave requests</p>
        </div>
        <Button onClick={() => setIsApplyingLeave(true)}>
          <Plus size={18} className="mr-2" />
          Apply for Leave
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
              <p className="text-2xl font-bold text-warning mt-1">{stats.pending}</p>
            </div>
            <Clock className="text-warning/30" size={32} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Fully Approved</p>
              <p className="text-2xl font-bold text-success mt-1">{stats.approved}</p>
            </div>
            <CheckCircle className="text-success/30" size={32} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold text-destructive mt-1">{stats.rejected}</p>
            </div>
            <XCircle className="text-destructive/30" size={32} />
          </div>
        </Card>
      </div>

      {/* Apply for Leave Form */}
      {isApplyingLeave && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Apply for Leave</h2>
            <button
              onClick={() => {
                setIsApplyingLeave(false);
                reset();
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Leave Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Leave Type</label>
                <select
                  {...register('type')}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                >
                  <option value="sick">Sick Leave</option>
                  <option value="casual">Casual Leave</option>
                  <option value="earned">Earned Leave</option>
                  <option value="emergency">Emergency Leave</option>
                </select>
                {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <input
                  {...register('startDate')}
                  type="date"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                />
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <input
                  {...register('endDate')}
                  type="date"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                />
                {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
              </div>

              {/* Reason */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Reason</label>
                <textarea
                  {...register('reason')}
                  placeholder="Please provide reason for leave..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none resize-none"
                />
                {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">Submit Application</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsApplyingLeave(false);
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
          All Leaves
        </Button>
        {['pending', 'hod_approved', 'approved', 'rejected'].map((status) => (
          <Button
            key={status}
            variant={selectedStatus === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStatus(status)}
          >
            {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
          </Button>
        ))}
      </div>


      {/* Leaves List */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-foreground">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Duration</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Dates</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Reason</th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">Status</th>
                {currentUser?.role !== 'student' && currentUser?.role !== 'faculty' && (
                  <th className="text-center py-3 px-4 font-semibold text-foreground">Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={currentUser?.role !== 'student' && currentUser?.role !== 'faculty' ? 7 : 6} className="py-8 text-center text-muted-foreground">
                    No leave records
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((leave) => (
                  <tr key={leave.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{leave.applicantName}</td>
                    <td className="py-3 px-4 text-foreground">{leave.type.charAt(0).toUpperCase() + leave.type.slice(1)}</td>
                    <td className="py-3 px-4 text-foreground">
                      {calculateDuration(leave.startDate, leave.endDate)} days
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-sm">
                      {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-sm">{leave.reason.substring(0, 20)}...</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getLeaveStatus(leave.status)}`}>
                        {leave.status.toUpperCase()}
                      </span>
                    </td>
                    {currentUser?.role !== 'student' && currentUser?.role !== 'faculty' && leave.status === 'pending' && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleUpdateStatus(leave.id, 'approve')}
                            className="px-3 py-1 rounded text-xs font-semibold bg-success/10 text-success hover:bg-success/20 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(leave.id, 'reject')}
                            className="px-3 py-1 rounded text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
