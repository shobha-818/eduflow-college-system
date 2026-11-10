'use client';

import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export function ApprovalsWidget() {
  const { getPendingApprovals, updateApprovalStatus, currentUser } = useAppStore();
  const pendingApprovals = getPendingApprovals();

  const handleApproval = (id: string, status: 'approved' | 'rejected') => {
    updateApprovalStatus(id, status, currentUser?.id || '');
    toast.success(`Request ${status} successfully`);
  };

  if (pendingApprovals.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Pending Approvals</h2>
        <p className="text-sm text-muted-foreground text-center py-8">No pending approvals</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Pending Approvals</h2>
        <span className="text-sm font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full">
          {pendingApprovals.length}
        </span>
      </div>

      <div className="space-y-4">
        {pendingApprovals.map((approval) => (
          <div key={approval.id} className="p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="font-semibold text-foreground">{approval.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{approval.requestedByName}</p>
                <p className="text-sm text-muted-foreground">{approval.description}</p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleApproval(approval.id, 'approved')}
                    className="flex items-center gap-1"
                  >
                    <CheckCircle2 size={16} />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApproval(approval.id, 'rejected')}
                    className="flex items-center gap-1"
                  >
                    <XCircle size={16} />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pendingApprovals.length > 3 && (
        <div className="mt-4">
          <Link href="/dashboard/approvals">
            <Button variant="outline" className="w-full">View All Approvals</Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
