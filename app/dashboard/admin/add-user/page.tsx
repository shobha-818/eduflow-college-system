'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, UserPlus, Mail, Phone, Hash, Shield, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AddUserPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student',
    department: '',
    phone: '',
    employee_id: '',
  });

  // Generate random temporary password
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const tempPassword = generateTempPassword();
      const verificationToken = crypto.randomUUID();

      // 1. Create the user in Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: tempPassword,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
            department: formData.department,
            phone: formData.phone,
            email_verified: false,
            is_approved: true,
            verification_token: verificationToken
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create auth user');

      // 2. Sync profile and send notification via API (Fire and Forget)
      fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'verification',
          recipients: [{
            email: formData.email,
            id: authData.user.id
          }],
          data: {
            email: formData.email,
            name: formData.name,
            role: formData.role,
            department: formData.department,
            phone: formData.phone,
            tempPassword: tempPassword,
            verificationToken: verificationToken,
            userId: authData.user.id
          }
        }),
      }).catch(err => console.error('Notification background error:', err));

      toast.success(`${formData.role} added successfully!`);
      toast.info(`📧 Welcome email sent to: ${formData.email}`, {
        description: `Temporary password: ${tempPassword}`,
        duration: 10000
      });

      router.push('/dashboard/admin/users');
    } catch (error: any) {
      // 'Failed to fetch' = network error; most likely the Supabase project is paused
      const msg = error?.message || String(error);
      if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
        toast.error('Cannot reach Supabase. The project may be paused — please restore it at supabase.com/dashboard.');
      } else {
        toast.error(msg || 'An unexpected error occurred. Please try again.');
      }
      console.error('[AddUser] handleSubmit error:', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/users">
          <Button variant="ghost" size="icon">
            <ChevronLeft size={20} />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add New User</h1>
          <p className="text-muted-foreground">Register a new staff member or student</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <UserPlus size={16} /> Full Name
              </label>
              <Input
                required
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail size={16} /> Email Address
              </label>
              <Input
                required
                type="email"
                placeholder="john@college.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Shield size={16} /> Role
              </label>
              <select
                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="hod">Head of Department (HOD)</option>
                <option value="principal">Principal</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Briefcase size={16} /> Department
              </label>
              <Input
                placeholder="Computer Science"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Phone size={16} /> Phone Number
              </label>
              <Input
                placeholder="+1 234 567 890"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Hash size={16} /> Employee/Student ID
              </label>
              <Input
                placeholder="CS-2024-001"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Creating User...' : 'Create User Account'}
            </Button>
            <Link href="/dashboard/admin/users" className="flex-1">
              <Button type="button" variant="outline" className="w-full">Cancel</Button>
            </Link>
          </div>
        </form>
      </Card>
      
      <div className="bg-muted/30 p-4 rounded-lg border border-dashed border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Note:</strong> This will create a profile record. The user will still need to sign up via the main login with their email to set a password, or you can use Supabase Auth Admin to invite them directly.
        </p>
      </div>
    </div>
  );
}
