'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { supabaseSync } from '@/lib/supabase-sync';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X, Building2, User } from 'lucide-react';
import { toast } from 'sonner';
import { UserSelect } from '@/components/UserSelect';

export default function DepartmentsPage() {
  const { currentUser, departments } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    hod_id: ''
  });

  useEffect(() => {
    supabaseSync.syncDepartments();
  }, []);

  if (currentUser?.role !== 'principal') {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive">Unauthorized</h1>
        <p className="text-muted-foreground">Only the Principal can manage departments.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to create department');
      
      toast.success('Department created successfully');
      setFormData({ name: '', code: '', hod_id: '' });
      setIsAdding(false);
      supabaseSync.syncDepartments();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Departments</h1>
          <p className="text-muted-foreground">Manage college departments and HODs</p>
        </div>
        <Button onClick={() => setIsAdding(true)}>
          <Plus size={18} className="mr-2" />
          Add Department
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">New Department</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              <X size={20} />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Department Name</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Computer Science"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border outline-none"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Code</label>
                <input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. CS"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border outline-none"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Head of Department (HOD)</label>
              <UserSelect 
                value={formData.hod_id} 
                onChange={(val) => setFormData({ ...formData, hod_id: val })}
                placeholder="Assign HOD..."
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Create Department</Button>
              <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <Card key={dept.id} className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-primary">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 size={20} className="text-primary" />
                  <span className="text-sm font-bold text-primary">{dept.code}</span>
                </div>
                <h3 className="text-xl font-bold text-foreground">{dept.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                  <User size={16} />
                  <span>HOD: {dept.hodId ? 'Assigned' : 'Not Assigned'}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
