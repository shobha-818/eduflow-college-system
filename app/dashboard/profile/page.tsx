'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { User, Mail, Phone, Shield, Lock, Eye, EyeOff } from 'lucide-react';

export default function ProfilePage() {
  const { currentUser, setCurrentUser } = useAppStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchProfile();
  }, [currentUser]);

  const fetchProfile = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      toast.error('Unable to load profile information');
      setLoading(false);
      return;
    }

    setProfile(data);
    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    if (!profile?.name || !profile?.phone) {
      toast.error('Name and phone number are required');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        name: profile.name,
        phone: profile.phone,
      })
      .eq('id', currentUser?.id);

    if (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      return;
    }

    toast.success('Profile updated successfully!');
    if (setCurrentUser && currentUser) {
      setCurrentUser({ ...currentUser, name: profile.name, phone: profile.phone });
    }
    setEditing(false);
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      const userEmail = currentUser?.email || profile?.email || '';
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: passwordData.currentPassword,
      });

      if (signInError) {
        toast.error('Current password is incorrect');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) {
        throw error;
      }

      toast.success('Password changed successfully! Please login again');
      setShowChangePassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });

      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
      }, 1500);
    } catch (error: any) {
      console.error('Password update failed:', error);
      toast.error(error?.message || 'Failed to change password');
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading profile...</div>;
  }

  if (!currentUser || !profile) {
    return <div className="p-6 text-center">Unable to load profile.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account information and security</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-3xl font-bold text-primary">{profile?.name?.charAt(0) || '?'}</span>
          </div>

          <div className="flex-1">
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <Input
                    value={profile.name || ''}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Full Name"
                    className="max-w-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <Input
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="Phone Number"
                    className="max-w-md"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleUpdateProfile}>Save</Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <h2 className="text-2xl font-bold">{profile.name}</h2>
                  <p className="text-muted-foreground">{profile.email}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-sm text-foreground/80">
                    <Phone size={16} />
                    <span>{profile.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground/80 capitalize">
                    <User size={16} />
                    <span>{profile.role}</span>
                  </div>
                </div>

                <Button variant="outline" className="mt-3" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Security</h3>
            <p className="text-sm text-muted-foreground">Update your password for account security</p>
          </div>
          {!showChangePassword && (
            <Button variant="outline" onClick={() => setShowChangePassword(true)}>
              <Lock size={16} className="mr-2" />
              Change Password
            </Button>
          )}
        </div>

        {showChangePassword && (
          <div className="space-y-4 border-t pt-4">
            <div className="relative">
              <label className="block text-sm font-medium mb-1">Current Password</label>
              <div className="relative max-w-md">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium mb-1">New Password</label>
              <div className="relative max-w-md">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password (min 6 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="max-w-md">
              <label className="block text-sm font-medium mb-1">Confirm New Password</label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleChangePassword}>Update Password</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
