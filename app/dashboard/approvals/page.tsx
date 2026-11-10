'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { supabaseSync } from '@/lib/supabase-sync';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  User, 
  MessageSquare,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ApprovalsPage() {
  const { currentUser, leaves } = useAppStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch leaves whenever currentUser becomes available (auth-guarded)
  const fetchLeaves = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsSyncing(true);
    try {
      await supabaseSync.syncLeaves();
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleSync = async () => {
    await fetchLeaves();
    toast.success('Approvals data refreshed');
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await supabaseSync.updateLeaveStatus(id, action);
      // Refresh list after action
      await supabaseSync.syncLeaves();
      toast.success(`Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} leave request`);
    }
  };

  if (!currentUser) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Clock className="w-12 h-12 text-muted-foreground mb-4 animate-spin opacity-40" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (currentUser.role !== 'principal' && currentUser.role !== 'hod') {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground mt-2 text-center max-w-md">
          Only HODs and Principals can access the approval dashboard. 
          Please contact administration if you believe this is an error.
        </p>
      </div>
    );
  }

  // The /api/leaves GET handler already filters correctly by role:
  //   - HOD  → 'pending' leaves in their department
  //   - Principal → 'hod_approved' leaves from all departments
  // We apply additional client-side search/status filters on top.
  const filteredLeaves = leaves.filter(leave => {
    const matchesSearch =
      leave.applicantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.reason?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || leave.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending HOD</Badge>;
      case 'hod_approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pending Principal</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Fully Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Determine what the current user is waiting on
  const getActionLabel = (leaveStatus: string) => {
    if (currentUser.role === 'hod' && leaveStatus === 'pending') return 'action'; // HOD can act on 'pending'
    if (currentUser.role === 'principal' && leaveStatus === 'hod_approved') return 'action'; // Principal can act on 'hod_approved'
    if (leaveStatus === 'approved' || leaveStatus === 'rejected') return 'done';
    return 'waiting';
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Approvals</h1>
          <p className="text-muted-foreground">
            {currentUser.role === 'hod'
              ? `Pending leave requests for ${currentUser.department || 'your department'}.`
              : 'HOD-approved requests awaiting final Principal approval.'}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleSync} 
          disabled={isSyncing}
          className="w-fit"
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
          Refresh Data
        </Button>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', count: leaves.length, color: 'text-foreground' },
          { label: 'Pending', count: leaves.filter(l => l.status === 'pending').length, color: 'text-yellow-600' },
          { label: 'HOD Approved', count: leaves.filter(l => l.status === 'hod_approved').length, color: 'text-blue-600' },
          { label: 'Processed', count: leaves.filter(l => l.status === 'approved' || l.status === 'rejected').length, color: 'text-green-600' },
        ].map(({ label, count, color }) => (
          <Card key={label} className="p-3 text-center">
            <p className={`text-2xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {/* Search & Filter */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by name or reason..." 
              className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select 
              className="flex-1 md:w-[200px] p-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending HOD</option>
              <option value="hod_approved">Pending Principal</option>
              <option value="approved">Fully Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Leaves List */}
      <div className="grid gap-4">
        {isSyncing && leaves.length === 0 ? (
          <Card className="p-12 text-center">
            <RefreshCw className="w-10 h-10 text-muted-foreground mx-auto mb-4 animate-spin opacity-40" />
            <p className="text-muted-foreground">Loading leave requests...</p>
          </Card>
        ) : filteredLeaves.length > 0 ? (
          filteredLeaves.map((leave) => {
            const actionState = getActionLabel(leave.status);
            return (
              <Card
                key={leave.id}
                className={cn(
                  "overflow-hidden border-l-4 hover:shadow-md transition-shadow",
                  leave.status === 'pending' && "border-l-yellow-500",
                  leave.status === 'hod_approved' && "border-l-blue-500",
                  leave.status === 'approved' && "border-l-green-500",
                  leave.status === 'rejected' && "border-l-red-400"
                )}
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="space-y-4 flex-1">
                      {/* Applicant header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <User size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{leave.applicantName || 'Unknown'}</h3>
                            <p className="text-sm text-muted-foreground">{leave.department || 'General'}</p>
                          </div>
                        </div>
                        {getStatusBadge(leave.status)}
                      </div>

                      {/* Leave details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar size={16} className="text-primary" />
                          <span>
                            <strong>From:</strong> {new Date(leave.startDate).toLocaleDateString()}
                          </span>
                          <span className="mx-1">→</span>
                          <span>
                            <strong>To:</strong> {new Date(leave.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="secondary" className="capitalize">{leave.type}</Badge>
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="p-3 bg-muted/50 rounded-lg border border-muted italic text-sm text-muted-foreground flex gap-3">
                        <MessageSquare size={16} className="flex-shrink-0 mt-1" />
                        <p>"{leave.reason}"</p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-row lg:flex-col items-center justify-end gap-3 lg:border-l lg:pl-6 lg:min-w-[140px]">
                      {actionState === 'action' ? (
                        <>
                          <Button 
                            onClick={() => handleAction(leave.id, 'approve')}
                            className="bg-green-600 hover:bg-green-700 w-full lg:w-32"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => handleAction(leave.id, 'reject')}
                            className="text-red-600 border-red-200 hover:bg-red-50 w-full lg:w-32"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </>
                      ) : actionState === 'done' ? (
                        <div className="text-center py-2 px-4 rounded bg-muted text-xs text-muted-foreground">
                          Processing Complete
                        </div>
                      ) : (
                        <div className="text-center py-2 px-4 rounded bg-muted text-xs text-muted-foreground">
                          Awaiting Previous Level
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="p-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium">No leave requests found</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filter.'
                : currentUser.role === 'hod'
                  ? 'No pending leave requests in your department.'
                  : 'No HOD-approved requests awaiting final approval.'}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
