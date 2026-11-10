'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ShieldAlert, LogOut, Mail } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

export default function PendingApprovalPage() {
  const { currentUser, logout } = useAppStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8 text-center space-y-6 shadow-2xl border-primary/20">
          <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={40} className="text-yellow-500 animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Approval Pending</h1>
            <p className="text-muted-foreground">
              Welcome, <span className="font-semibold text-primary">{currentUser?.name}</span>. Your account is currently awaiting administrative approval.
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg text-sm text-left flex gap-3 items-start border border-border">
            <ShieldAlert size={18} className="text-primary shrink-0 mt-0.5" />
            <p className="text-muted-foreground">
              Once an administrator approves your account, you will have full access to the college management dashboard.
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <Button variant="outline" className="w-full gap-2" onClick={() => window.location.reload()}>
              Check Status
            </Button>
            <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={handleLogout}>
              <LogOut size={16} />
              Sign Out
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground pt-4">
            Contact <span className="underline italic">admin@college.edu</span> for urgent assistance.
          </p>
        </Card>
      </div>
    </div>
  );
}
