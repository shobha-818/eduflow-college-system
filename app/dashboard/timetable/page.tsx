'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppStore } from '@/lib/store';
import { supabaseSync } from '@/lib/supabase-sync';
import { timeSlotSchema, type TimeSlotInput } from '@/lib/validation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getDayName, formatTime, hasTimeConflict } from '@/lib/utils-eduflow';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
  '09:00', '09:45', '10:30', '11:15', '12:00', '12:45',
  '13:30', '14:15', '15:00', '15:45', '16:30', '17:15'
];

export default function TimetablePage() {
  const { currentUser, timeSlots, addTimeSlot, updateTimeSlot, deleteTimeSlot } = useAppStore();
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(currentUser?.department || '');
  const [selectedSemester, setSelectedSemester] = useState(currentUser?.semester?.toString() || '4');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<TimeSlotInput>({
    resolver: zodResolver(timeSlotSchema),
    defaultValues: {
      semester: parseInt(selectedSemester),
      department: selectedDepartment,
    },
  });

  // Filter time slots
  const filteredSlots = timeSlots.filter(
    (slot) =>
      (!selectedDepartment || slot.department === selectedDepartment) &&
      (!selectedSemester || slot.semester === parseInt(selectedSemester))
  );

  const departments = Array.from(new Set(timeSlots.map((s) => s.department)));
  const semesters = Array.from(new Set(timeSlots.map((s) => s.semester))).sort();

  const onSubmit = async (data: TimeSlotInput) => {
    try {
      // Check for conflicts
      const conflicts = filteredSlots.filter((existing) => {
        const sameDay = existing.dayOfWeek === data.dayOfWeek;
        const sameFaculty = existing.faculty === data.faculty;
        const sameRoom = existing.room === data.room;

        if ((sameFaculty || sameRoom) && sameDay) {
          return hasTimeConflict(
            { startTime: existing.startTime, endTime: existing.endTime },
            { startTime: data.startTime, endTime: data.endTime }
          );
        }
        return false;
      });

      if (conflicts.length > 0) {
        toast.error('Time slot conflict detected! Faculty or room is already booked.');
        return;
      }

      const slotData = {
        ...data,
        day_of_week: data.dayOfWeek,
        start_time: data.startTime,
        end_time: data.endTime,
      };
      await supabaseSync.addTimeSlot(slotData as any);
      toast.success('Time slot added successfully');
      reset();
      setIsAddingSlot(false);
      // Refresh time slots after adding
      await fetchTimeSlots();
    } catch (error) {
      toast.error('Failed to add time slot');
    }
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      await supabaseSync.deleteTimeSlot(id);
      toast.success('Time slot deleted');
      // Refresh time slots after deleting
      await fetchTimeSlots();
    } catch (error) {
      toast.error('Failed to delete time slot');
    }
  };

  // Fetch time slots on page load
  const fetchTimeSlots = async () => {
    if (!currentUser) return;
    try {
      await useAppStore.getState().loadInitialData();
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTimeSlots();
    }
  }, [currentUser]);

  // Sync state filters with currentUser profile once loaded
  useEffect(() => {
    if (currentUser) {
      if (currentUser.department) {
        setSelectedDepartment(currentUser.department);
      }
      if (currentUser.semester) {
        setSelectedSemester(currentUser.semester.toString());
      }
    }
  }, [currentUser]);

  // Group slots by day
  const slotsByDay = DAYS.map((day, index) => ({
    day,
    index,
    slots: filteredSlots.filter((s) => s.dayOfWeek === index).sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Timetable & Scheduling</h1>
          <p className="text-muted-foreground">Manage class schedules and time slots</p>
        </div>
        {currentUser?.role !== 'student' && (
          <Button onClick={() => setIsAddingSlot(true)}>
            <Plus size={18} className="mr-2" />
            Add Time Slot
          </Button>
        )}
      </div>

      {/* Add Time Slot Form */}
      {isAddingSlot && currentUser?.role !== 'student' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Add New Time Slot</h2>
            <button
              onClick={() => {
                setIsAddingSlot(false);
                reset();
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Day */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Day of Week</label>
                <select
                  {...register('dayOfWeek', { valueAsNumber: true })}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                >
                  {DAYS.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
                {errors.dayOfWeek && <p className="text-xs text-destructive">{errors.dayOfWeek.message}</p>}
              </div>

              {/* Start Time */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <input
                  {...register('startTime')}
                  type="time"
                  placeholder="09:00"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                />
                {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
              </div>

              {/* End Time */}
              <div className="space-y-2">
                <label className="text-sm font-medium">End Time</label>
                <input
                  {...register('endTime')}
                  type="time"
                  placeholder="10:30"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                />
                {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <input
                  {...register('subject')}
                  placeholder="e.g., Data Structures"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                />
                {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
              </div>

              {/* Faculty */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Faculty Name</label>
                <input
                  {...register('faculty')}
                  placeholder="e.g., Prof. Sharma"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                />
                {errors.faculty && <p className="text-xs text-destructive">{errors.faculty.message}</p>}
              </div>

              {/* Room */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Room Number</label>
                <input
                  {...register('room')}
                  placeholder="e.g., A-101"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                />
                {errors.room && <p className="text-xs text-destructive">{errors.room.message}</p>}
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
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {errors.semester && <p className="text-xs text-destructive">{errors.semester.message}</p>}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">Add Time Slot</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingSlot(false);
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
        {currentUser?.role === 'principal' || currentUser?.role === 'hod' ? (
          <>
            <div className="flex-1">
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
          </>
        ) : (
          <div className="w-full text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            Showing timetable for Semester {selectedSemester} - {selectedDepartment}
          </div>
        )}
      </Card>

      {/* Timetable Grid */}
      <div className="space-y-6">
        {slotsByDay.map((dayData) => (
          <Card key={dayData.index} className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">{dayData.day}</h2>
            {dayData.slots.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No classes scheduled</p>
            ) : (
              <div className="space-y-3">
                {dayData.slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{slot.subject}</p>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {slot.department} - Sem {slot.semester}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <p>
                            <span className="font-medium">Time:</span> {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </p>
                          <p>
                            <span className="font-medium">Faculty:</span> {slot.faculty}
                          </p>
                          <p>
                            <span className="font-medium">Room:</span> {slot.room}
                          </p>
                        </div>
                      </div>
                      {currentUser?.role !== 'student' && (
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="p-2 hover:bg-destructive/10 rounded transition-colors"
                        >
                          <X size={18} className="text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Info Box */}
      {filteredSlots.length === 0 && !isAddingSlot && (
        <Card className="p-6 bg-muted/50 border-border flex gap-4">
          <AlertCircle className="text-warning flex-shrink-0" size={24} />
          <div>
            <p className="font-medium text-foreground">No time slots found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {currentUser?.role !== 'student'
                ? 'Add a new time slot to get started.'
                : 'Check back later for the updated timetable.'}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
