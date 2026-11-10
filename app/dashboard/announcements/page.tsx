'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppStore } from '@/lib/store';
import { supabaseSync } from '@/lib/supabase-sync';
import { announcementSchema, type AnnouncementInput } from '@/lib/validation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X, MessageCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime, sortByDate } from '@/lib/utils-eduflow';

export default function AnnouncementsPage() {
  const { currentUser, announcements, addAnnouncement } = useAppStore();
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<string>('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AnnouncementInput>({
    resolver: zodResolver(announcementSchema),
  });

  const sortedAnnouncements = sortByDate(announcements);
  const filteredAnnouncements = selectedPriority
    ? sortedAnnouncements.filter((a) => a.priority === selectedPriority)
    : sortedAnnouncements;

  const onSubmit = async (data: AnnouncementInput) => {
    try {
      await supabaseSync.addAnnouncement(data);
      toast.success('Announcement posted successfully');
      reset();
      setIsAddingAnnouncement(false);
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to post announcement');
    }
  };

  const audiences = [
    { value: 'all', label: 'All Users', icon: '🌍' },
    { value: 'faculty', label: 'Faculty Only', icon: '👨‍🏫' },
    { value: 'students', label: 'Students Only', icon: '👥' },
    { value: 'department', label: 'Department Only', icon: '🏢' },
  ];

  const priorities = [
    { value: 'high', label: 'High', color: 'bg-destructive/10 text-destructive' },
    { value: 'medium', label: 'Medium', color: 'bg-warning/10 text-warning' },
    { value: 'low', label: 'Low', color: 'bg-primary/10 text-primary' },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Announcements</h1>
          <p className="text-muted-foreground">Post and manage college announcements</p>
        </div>
        {currentUser?.role !== 'student' && (
          <Button onClick={() => setIsAddingAnnouncement(true)}>
            <Plus size={18} className="mr-2" />
            Post Announcement
          </Button>
        )}
      </div>

      {/* Post Announcement Form */}
      {isAddingAnnouncement && currentUser?.role !== 'student' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Post New Announcement</h2>
            <button
              onClick={() => {
                setIsAddingAnnouncement(false);
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
                placeholder="Announcement title"
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <textarea
                {...register('content')}
                placeholder="Enter announcement details..."
                rows={4}
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none resize-none"
              />
              {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
            </div>

            {/* Audience */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Audience</label>
              <select
                {...register('audience')}
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
              >
                {audiences.map((aud) => (
                  <option key={aud.value} value={aud.value}>
                    {aud.icon} {aud.label}
                  </option>
                ))}
              </select>
              {errors.audience && <p className="text-xs text-destructive">{errors.audience.message}</p>}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <select
                {...register('priority')}
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
              >
                {priorities.map((pri) => (
                  <option key={pri.value} value={pri.value}>
                    {pri.label}
                  </option>
                ))}
              </select>
              {errors.priority && <p className="text-xs text-destructive">{errors.priority.message}</p>}
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">Post Announcement</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingAnnouncement(false);
                  reset();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Priority Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedPriority === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedPriority('')}
        >
          All Announcements
        </Button>
        {priorities.map((pri) => (
          <Button
            key={pri.value}
            variant={selectedPriority === pri.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPriority(pri.value)}
          >
            {pri.label} Priority
          </Button>
        ))}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No announcements yet</p>
          </Card>
        ) : (
          filteredAnnouncements.map((announcement) => (
            <Card
              key={announcement.id}
              className="p-6 hover:shadow-lg transition-shadow border border-border"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-foreground">{announcement.title}</h3>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        announcement.priority === 'high'
                          ? 'bg-destructive/10 text-destructive'
                          : announcement.priority === 'medium'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {announcement.priority.toUpperCase()}
                      </span>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground">
                        {announcement.audience === 'all'
                          ? '🌍 All'
                          : announcement.audience === 'faculty'
                          ? '👨‍🏫 Faculty'
                          : announcement.audience === 'students'
                          ? '👥 Students'
                          : '🏢 Department'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <p className="text-foreground leading-relaxed">{announcement.content}</p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Posted on {formatDateTime(announcement.createdAt)}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Announcements</p>
          <p className="text-2xl font-bold text-primary mt-2">{announcements.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">High Priority</p>
          <p className="text-2xl font-bold text-destructive mt-2">
            {announcements.filter((a) => a.priority === 'high').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">This Week</p>
          <p className="text-2xl font-bold text-primary mt-2">
            {announcements.filter((a) => {
              const date = new Date(a.createdAt);
              const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              return date > weekAgo;
            }).length}
          </p>
        </Card>
      </div>
    </div>
  );
}
