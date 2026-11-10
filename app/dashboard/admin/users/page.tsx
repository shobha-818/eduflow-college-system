'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Shield, UserCheck, UserX, Mail, Phone, Hash } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      toast.error('Could not load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleApproval = async (user: any) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          is_approved: !user.is_approved
        }),
      });

      if (!res.ok) throw new Error('Update failed');
      
      toast.success(`User ${user.is_approved ? 'disabled' : 'approved'} successfully`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const filteredUsers = users.filter(user => {
    const name = user.name || '';
    const email = user.email || '';
    const role = user.role || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage college staff and student accounts</p>
        </div>
        <Link href="/dashboard/admin/add-user">
          <Button className="gap-2">
            <UserPlus size={18} />
            Add New User
          </Button>
        </Link>
      </div>

      <Card className="p-4">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
          <Input
            placeholder="Search by name, email or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-sm font-medium text-muted-foreground">
                <th className="py-4 px-4">User</th>
                <th className="py-4 px-4">Role</th>
                <th className="py-4 px-4">Details</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">Loading users...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">No users found</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{user.name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail size={12} />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground capitalize">
                        <Shield size={12} />
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone size={12} />
                            {user.phone}
                          </div>
                        )}
                        {user.employee_id && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Hash size={12} />
                            ID: {user.employee_id}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {user.is_approved ? (
                        <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
                          <UserCheck size={14} />
                          Approved
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-yellow-500 font-medium">
                          <UserX size={14} />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Button
                        variant={user.is_approved ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleApproval(user)}
                        className={user.is_approved ? "text-destructive border-destructive hover:bg-destructive/10" : ""}
                      >
                        {user.is_approved ? 'Disable' : 'Approve'}
                      </Button>
                    </td>
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
