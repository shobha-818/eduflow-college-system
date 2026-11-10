'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { supabaseSync } from '@/lib/supabase-sync';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MessageSquare, Eye, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function DirectoryPage() {
  const router = useRouter();
  const { currentUser, students } = useAppStore();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messageModal, setMessageModal] = useState<any>(null);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        setProfiles(data || []);
      } catch (error) {
        console.error('Error fetching profiles:', error);
        toast.error('Failed to load directory');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  const handleCall = (user: any) => {
    if (user.phone) {
      window.location.href = `tel:${user.phone}`;
      if (typeof window !== 'undefined' && !/Mobi|Android/i.test(navigator.userAgent)) {
        toast.info(`${user.name}: ${user.phone}`);
      }
    } else {
      toast.info(`${user.name} has no phone number saved`);
    }
  };

  const handleMessage = async (user: any) => {
    if (!currentUser) {
      toast.error('Please login first');
      return;
    }

    try {
      const conversationId = await supabaseSync.getOrCreateDirectConversation(user.id);
      if (conversationId) {
        router.push(`/dashboard/chat?conversation=${conversationId}`);
      } else {
        toast.error('Could not start conversation');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    }
  };

  const handleSendMessage = (user: any) => {
    if (!messageText.trim()) {
      toast.error('Please enter a message');
      return;
    }
    toast.success(`Message sent to ${user.name}`);
    setMessageModal(null);
    setMessageText('');
  };

  // Combine profiles and student records for a comprehensive directory
  // Note: students are specific records, profiles are auth-linked users
  const allUsers = [...profiles];

  const filteredUsers = allUsers.filter((user) => {
    const name = user.name || '';
    const email = user.email || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesDept = deptFilter === 'all' || user.department === deptFilter;
    return matchesSearch && matchesRole && matchesDept;
  });

  const departments = Array.from(new Set(allUsers.map((u) => u.department).filter(Boolean)));
  const roles = Array.from(new Set(allUsers.map((u) => u.role).filter(Boolean)));

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'principal':
        return 'bg-red-100 text-red-800';
      case 'hod':
        return 'bg-purple-100 text-purple-800';
      case 'faculty':
        return 'bg-blue-100 text-blue-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">User Directory</h1>
        <p className="text-muted-foreground">Search and connect with faculty, staff, and students</p>
      </div>

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Role Filter */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Filter by Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
              >
                <option value="all">All Roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Filter by Department
              </label>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        Found {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
      </p>

      {/* Users Grid */}
      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                {/* User Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge className={getRoleBadgeColor(user.role || 'student')}>
                    {(user.role || 'student').charAt(0).toUpperCase() + (user.role || 'student').slice(1)}
                  </Badge>
                </div>

                {/* Department and Phone */}
                <div className="space-y-1 text-sm">
                  <p className="text-foreground">
                    <span className="font-medium">Department:</span> {user.department}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium">Phone:</span> {user.phone}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUser(user)}
                    className="flex-1"
                  >
                    <Eye size={16} className="mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleCall(user)}
                  >
                    <Phone size={16} className="mr-1" />
                    Call
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleMessage(user)}
                  >
                    <MessageSquare size={16} className="mr-1" />
                    Message
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No users found matching your criteria.</p>
        </Card>
      )}

      {/* View Profile Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedUser(null)}
        >
          <Card
            className="max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{selectedUser.name}</h2>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                </div>
                  <Badge className={getRoleBadgeColor(selectedUser.role || 'student')}>
                    {(selectedUser.role || 'student').charAt(0).toUpperCase() + (selectedUser.role || 'student').slice(1)}
                  </Badge>
              </div>

              <div className="space-y-2 border-y border-border py-4">
                <p className="text-sm">
                  <span className="font-medium text-foreground">Department:</span>{' '}
                  <span className="text-muted-foreground">{selectedUser.department}</span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-foreground">Phone:</span>{' '}
                  <span className="text-muted-foreground">{selectedUser.phone}</span>
                </p>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => handleCall(selectedUser)}>
                  <Phone size={16} className="mr-2" />
                  Call
                </Button>
                <Button className="flex-1" onClick={() => handleMessage(selectedUser)}>
                  <MessageSquare size={16} className="mr-2" />
                  Message
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedUser(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Message Modal */}
      {messageModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setMessageModal(null)}
        >
          <Card
            className="max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Send Message</h2>
                <p className="text-sm text-muted-foreground">To: {messageModal.name}</p>
              </div>

              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message..."
                className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:border-primary outline-none min-h-32"
              />

              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => handleSendMessage(messageModal)}
                >
                  Send
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setMessageModal(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
