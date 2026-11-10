'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Lock } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="text-4xl font-bold text-primary mb-2">EduFlow</div>
          <h1 className="text-3xl font-bold text-foreground">Registration Restricted</h1>
          <p className="text-muted-foreground">College Management System</p>
        </div>

        <Card className="p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Lock size={32} className="text-primary" />
          </div>
          
          <div className="space-y-3">
            <p className="text-foreground font-medium text-lg">Self-registration is disabled</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              To ensure system security, new accounts can only be created by the College Administrator. 
              Please contact your department head or the administration office to receive your credentials.
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg text-sm text-left border border-border">
            <p className="font-semibold text-primary mb-1">How to get access:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Submit your details to the HOD</li>
              <li>Provide your official college email</li>
              <li>Wait for activation email</li>
            </ul>
          </div>

          <Link href="/">
            <Button className="w-full mt-4">Return to Sign In</Button>
          </Link>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Administrative assistance: <span className="font-medium text-primary">admin@college.edu</span>
          </p>
        </div>
      </div>
    </div>
  );
}