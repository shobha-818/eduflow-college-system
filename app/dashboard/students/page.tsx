'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppStore } from '@/lib/store';
import { supabaseSync } from '@/lib/supabase-sync';
import { studentSchema, type StudentInput } from '@/lib/validation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, Trash2, Edit2, X } from 'lucide-react';
import { toast } from 'sonner';
import { searchByName, filterByDepartment, filterBySemester } from '@/lib/utils-eduflow';

export default function StudentsPage() {
  const { currentUser, students, addStudent, updateStudent, deleteStudent } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<StudentInput>({
    resolver: zodResolver(studentSchema),
  });

  // Filter students
  let filteredStudents = students;
  filteredStudents = searchByName(filteredStudents, searchQuery);
  if (selectedDepartment) {
    filteredStudents = filterByDepartment(filteredStudents, selectedDepartment);
  }
  if (selectedSemester) {
    filteredStudents = filterBySemester(filteredStudents, parseInt(selectedSemester));
  }

  const departments = Array.from(new Set(students.map((s) => s.department)));
  const semesters = Array.from(new Set(students.map((s) => s.semester))).sort();

  const onSubmit = async (data: StudentInput) => {
    try {
      if (editingId) {
        await supabaseSync.updateStudent(editingId, data);
        toast.success('Student updated successfully');
        setEditingId(null);
      } else {
        const studentData = {
          ...data,
          enrollmentDate: new Date().toISOString().split('T')[0],
        };
        await supabaseSync.addStudent(studentData);
        toast.success('Student added successfully');
      }
      reset();
      setIsAddingStudent(false);
    } catch (error) {
      toast.error('Failed to save student');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabaseSync.deleteStudent(id);
      toast.success('Student deleted');
    } catch (error) {
      toast.error('Failed to delete student');
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Student Management</h1>
          <p className="text-muted-foreground">Manage and view student information</p>
        </div>
        {currentUser?.role !== 'student' && (
          <Button onClick={() => setIsAddingStudent(true)}>
            <Plus size={18} className="mr-2" />
            Add Student
          </Button>
        )}
      </div>

      {/* Add/Edit Student Form */}
      {(isAddingStudent || editingId) && currentUser?.role !== 'student' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {editingId ? 'Edit Student' : 'Add New Student'}
            </h2>
            <button
              onClick={() => {
                setIsAddingStudent(false);
                setEditingId(null);
                reset();
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  {...register('name')}
                  placeholder="Full name"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="student@college.edu"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              {/* Roll Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Roll Number</label>
                <input
                  {...register('rollNumber')}
                  placeholder="e.g., CS001"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                />
                {errors.rollNumber && <p className="text-xs text-destructive">{errors.rollNumber.message}</p>}
              </div>

              {/* Department */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <select
                  {...register('department')}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                >
                  <option value="">Select Department</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Civil">Civil</option>
                </select>
                {errors.department && <p className="text-xs text-destructive">{errors.department.message}</p>}
              </div>

              {/* Semester */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Semester</label>
                <select
                  {...register('semester', { valueAsNumber: true })}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                >
                  <option value="">Select Semester</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {errors.semester && <p className="text-xs text-destructive">{errors.semester.message}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <input
                  {...register('phone')}
                  placeholder="10-digit phone number"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>

              {/* GPA */}
              <div className="space-y-2">
                <label className="text-sm font-medium">GPA</label>
                <input
                  {...register('gpa', { valueAsNumber: true })}
                  type="number"
                  placeholder="3.8"
                  step="0.1"
                  min="0"
                  max="4"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                />
              </div>

              {/* Address */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Address</label>
                <input
                  {...register('address')}
                  placeholder="Full address"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                />
                {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingId ? 'Update Student' : 'Add Student'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingStudent(false);
                  setEditingId(null);
                  reset();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium text-foreground block mb-2">Search</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
            />
          </div>
        </div>
        <div className="w-full md:w-40">
          <label className="text-sm font-medium text-foreground block mb-2">Department</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        <div className="w-full md:w-40">
          <label className="text-sm font-medium text-foreground block mb-2">Semester</label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
          >
            <option value="">All Semesters</option>
            {semesters.map((sem) => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Students Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-foreground">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Roll Number</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Department</th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">Semester</th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">GPA</th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-foreground">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground">{student.rollNumber}</td>
                    <td className="py-3 px-4 text-foreground">{student.department}</td>
                    <td className="py-3 px-4 text-center text-foreground">Sem {student.semester}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-primary">{student.gpa.toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {currentUser?.role !== 'student' && (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => {
                              setEditingId(student.id);
                              setIsAddingStudent(true);
                            }}
                            className="p-2 hover:bg-muted rounded transition-colors"
                          >
                            <Edit2 size={16} className="text-primary" />
                          </button>
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="p-2 hover:bg-muted rounded transition-colors"
                          >
                            <Trash2 size={16} className="text-destructive" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Students</p>
          <p className="text-2xl font-bold text-primary mt-2">{students.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Filtered Results</p>
          <p className="text-2xl font-bold text-primary mt-2">{filteredStudents.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Departments</p>
          <p className="text-2xl font-bold text-primary mt-2">{departments.length}</p>
        </Card>
      </div>
    </div>
  );
}
