'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppStore } from '@/lib/store';
import { meetingSchema, type MeetingInput } from '@/lib/validation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X, Calendar, MapPin, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils-eduflow';
import { MultiUserSelect } from '@/components/MultiUserSelect';
import { supabaseSync } from '@/lib/supabase-sync';

export default function MeetingsPage() {
  const { currentUser, meetings } = useAppStore();
  const [isSchedulingMeeting, setIsSchedulingMeeting] = useState(false);

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<MeetingInput>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      title: '',
      description: '',
      dateTime: new Date().toISOString().slice(0, 16),
      duration: 60,
      location: '',
      attendees: [currentUser?.id || ''],
    },
  });

  const onSubmit = async (data: MeetingInput) => {
    try {
      // Ensure attendees is an array of UUID strings
      const attendees = Array.isArray(data.attendees) 
        ? data.attendees 
        : [data.attendees as string];

      await supabaseSync.addMeeting({
        ...data,
        attendees: attendees,
      });

      toast.success('Meeting scheduled successfully');
      reset();
      setIsSchedulingMeeting(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule meeting');
    }
  };

  // Sort meetings by date
  const sortedMeetings = [...meetings].sort(
    (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
  );

  const upcomingMeetings = sortedMeetings.filter(
    (m) => new Date(m.dateTime) > new Date()
  );

  const pastMeetings = sortedMeetings.filter(
    (m) => new Date(m.dateTime) <= new Date()
  );

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Meetings & Events</h1>
          <p className="text-muted-foreground">Schedule and manage meetings</p>
        </div>
        {currentUser?.role !== 'student' && (
          <Button onClick={() => setIsSchedulingMeeting(true)}>
            <Plus size={18} className="mr-2" />
            Schedule Meeting
          </Button>
        )}
      </div>

      {/* Schedule Meeting Form */}
      {isSchedulingMeeting && currentUser?.role !== 'student' && (
        <Card className="p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Schedule New Meeting</h2>
            <button
              onClick={() => {
                setIsSchedulingMeeting(false);
                reset();
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <input
                {...register('title')}
                placeholder="Meeting title"
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none transition"
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                {...register('description')}
                placeholder="Meeting details..."
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none resize-none transition"
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date & Time */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date & Time</label>
                <input
                  {...register('dateTime')}
                  type="datetime-local"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none transition"
                />
                {errors.dateTime && <p className="text-xs text-destructive">{errors.dateTime.message}</p>}
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (minutes)</label>
                <input
                  {...register('duration', { valueAsNumber: true })}
                  type="number"
                  placeholder="60"
                  min="15"
                  max="480"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none transition"
                />
                {errors.duration && <p className="text-xs text-destructive">{errors.duration.message}</p>}
              </div>

              {/* Location */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Location</label>
                <input
                  {...register('location')}
                  placeholder="e.g., Conference Room A or Online Link"
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none transition"
                />
                {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
              </div>

              {/* Attendees */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users size={14} />
                  Attendees
                </label>
                <Controller
                  name="attendees"
                  control={control}
                  render={({ field }) => (
                    <MultiUserSelect
                      selectedUsers={Array.isArray(field.value) ? field.value : []}
                      onChange={field.onChange}
                      placeholder="Select colleagues or students..."
                    />
                  )}
                />
                {errors.attendees && <p className="text-xs text-destructive">{errors.attendees.message}</p>}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">Schedule Meeting</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsSchedulingMeeting(false);
                  reset();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Upcoming Meetings */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Upcoming Meetings</h2>
        {upcomingMeetings.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No upcoming meetings scheduled</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {upcomingMeetings.map((meeting) => (
              <Card key={meeting.id} className="p-6 border-l-4 border-l-primary hover:shadow-lg transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{meeting.title}</h3>
                      <p className="text-muted-foreground mt-1">{meeting.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-y border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={16} className="text-primary" />
                      <span className="text-foreground">{formatDateTime(meeting.dateTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={16} className="text-primary" />
                      <span className="text-foreground">{meeting.duration} minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin size={16} className="text-primary" />
                      <span className="text-foreground">{meeting.location}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">
                        Attendees ({meeting.attendees?.length || 0}):
                      </p>
                    </div>
                    <div className="pl-6">
                      <p className="text-sm text-muted-foreground line-clamp-2 italic">
                        {(meeting as any).attendeeNames || 'No attendees listed'}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past Meetings */}
      {pastMeetings.length > 0 && (
        <div className="space-y-4 opacity-70">
          <h2 className="text-xl font-semibold text-foreground">Past Meetings</h2>
          <div className="grid gap-4">
            {pastMeetings.slice(0, 5).map((meeting) => (
              <Card key={meeting.id} className="p-4 border-l-4 border-l-muted">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-muted p-2 rounded-full">
                      <Calendar size={16} className="text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{meeting.title}</h3>
                      <p className="text-xs text-muted-foreground">{formatDateTime(meeting.dateTime)}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                    Ended
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
