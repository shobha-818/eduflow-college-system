'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { supabaseSync } from '@/lib/supabase-sync';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X, BookOpen, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SubjectsPage() {
  const { currentUser, subjects, departments } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    department_id: '',
    semester: 1
  });

  useEffect(() => {
    supabaseSync.syncSubjects();
    supabaseSync.syncDepartments();
  }, []);

  const isAdmin = currentUser?.role === 'principal' || currentUser?.role === 'hod';

  if (!isAdmin) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-destructive">Unauthorized</h1>
        <p className="text-muted-foreground">Only Administrators can manage subjects.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to create subject');
      
      toast.success('Subject created successfully');
      setFormData({ name: '', code: '', department_id: '', semester: 1 });
      setIsAdding(false);
      supabaseSync.syncSubjects();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subjects</h1>
          <p className="text-muted-foreground">Manage department-specific subjects</p>
        </div>
        <Button onClick={() => setIsAdding(true)}>
          <Plus size={18} className="mr-2" />
          Add Subject
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">New Subject</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              <X size={20} />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject Name</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Data Structures"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border outline-none"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Code</label>
                <input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. CS302"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border outline-none"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border outline-none"
                  required
                  disabled={currentUser?.role !== 'principal'}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Semester</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border outline-none"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Create Subject</Button>
              <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subj) => (
          <Card key={subj.id} className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-warning">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen size={20} className="text-warning" />
                  <span className="text-sm font-bold text-warning">{subj.code}</span>
                </div>
                <h3 className="text-xl font-bold text-foreground">{subj.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                  <Building2 size={16} />
                  <span>{departments.find(d => d.id === subj.departmentId)?.name || 'Department'} • Sem {subj.semester}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
