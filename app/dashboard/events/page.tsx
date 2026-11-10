'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { supabaseSync } from '@/lib/supabase-sync';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, MapPin, Clock, Plus, X, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const EVENT_COLORS: Record<string, string> = {
  academic: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700',
  sports: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700',
  cultural: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700',
  workshop: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700',
  other: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  ongoing: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  completed: 'bg-gray-100 dark:bg-gray-900/40 text-gray-800 dark:text-gray-300',
};

export default function EventsPage() {
  const { currentUser, events, addEvent, registerForEvent, unregisterFromEvent, deleteEvent, isUserRegistered, getEventStats } = useAppStore();
  
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '09:00 AM',
    location: '',
    category: 'workshop' as const,
    maxCapacity: 100,
  });

  const stats = getEventStats();
  const today = new Date().toISOString().split('T')[0];

  // Filter events
  const filteredEvents = events.filter((event) => {
    const title = event.title || '';
    const description = event.description || '';
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const upcomingEvents = filteredEvents.filter((e) => e.date >= today);
  const pastEvents = filteredEvents.filter((e) => e.date < today);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.date || !formData.location) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await supabaseSync.addEvent(formData);
      setFormData({
        title: '',
        description: '',
        date: '',
        time: '09:00 AM',
        location: '',
        category: 'workshop',
        maxCapacity: 100,
      });
      setShowForm(false);
      toast.success('Event created successfully');
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to create event');
    }
  };

  const handleRegister = async (event: any) => {
    try {
      let newAttendees;
      if (isUserRegistered(event.id, currentUser?.id || '')) {
        newAttendees = event.attendees.filter((id: string) => id !== currentUser?.id);
        await supabaseSync.updateEvent(event.id, { attendees: newAttendees });
        toast.info('Unregistered from event');
      } else {
        if (event.attendees.length >= event.maxCapacity) {
          toast.error('Event is at full capacity');
          return;
        }
        newAttendees = [...event.attendees, currentUser?.id].filter(Boolean);
        await supabaseSync.updateEvent(event.id, { attendees: newAttendees });
        toast.success('Registered for event');
      }
    } catch (error) {
      toast.error('Failed to update registration');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await supabaseSync.deleteEvent(eventId);
        setSelectedEvent(null);
        toast.success('Event deleted');
      } catch (error) {
        toast.error('Failed to delete event');
      }
    }
  };

  const canCreateEvent = currentUser?.role === 'principal' || currentUser?.role === 'hod' || currentUser?.role === 'faculty';
  const canEditEvent = (event: any) => event.createdBy === currentUser?.id || currentUser?.role === 'principal';

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Events & Activities</h1>
          <p className="text-muted-foreground">View and manage college events with registration tracking</p>
        </div>
        {canCreateEvent && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus size={18} className="mr-2" />
            {showForm ? 'Cancel' : 'Create Event'}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Events</p>
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Upcoming</p>
            <p className="text-3xl font-bold text-primary">{stats.upcoming}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Participants</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.participants}</p>
          </div>
        </Card>
      </div>

      {/* Create Event Form */}
      {showForm && canCreateEvent && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Create New Event</h2>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <input
              type="text"
              placeholder="Event Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
              required
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none min-h-20"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="px-3 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                required
              />
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="px-3 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="px-3 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
                required
              />
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="px-3 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none text-foreground"
              >
                <option value="academic">Academic</option>
                <option value="sports">Sports</option>
                <option value="cultural">Cultural</option>
                <option value="workshop">Workshop</option>
                <option value="other">Other</option>
              </select>
            </div>
            <input
              type="number"
              min="1"
              value={formData.maxCapacity || ''}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setFormData({ ...formData, maxCapacity: isNaN(val) ? 0 : val });
              }}
              placeholder="Max Capacity"
              className="w-full px-3 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none"
            />
            <Button type="submit" className="w-full">Create Event</Button>
          </form>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none text-foreground"
          >
            <option value="all">All Categories</option>
            <option value="academic">Academic</option>
            <option value="sports">Sports</option>
            <option value="cultural">Cultural</option>
            <option value="workshop">Workshop</option>
            <option value="other">Other</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none text-foreground"
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </Card>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Upcoming Events</h2>
          <div className="grid gap-4">
            {upcomingEvents.map((event) => (
              <Card
                key={event.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${EVENT_COLORS[event.category || 'other']}`}>
                        {(event.category || 'other').toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[event.status || 'upcoming']}`}>
                        {(event.status || 'upcoming').toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{event.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4">{event.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        {event.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={16} />
                        {event.time}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={16} />
                        {event.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={16} />
                        {event.attendees.length} / {event.maxCapacity} attending
                      </div>
                    </div>
                    {/* Capacity Bar */}
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-muted-foreground">Capacity</p>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            event.attendees.length >= event.maxCapacity
                              ? 'bg-red-500'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min((event.attendees.length / event.maxCapacity) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {currentUser?.role !== 'student' && canEditEvent(event) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(event.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegister(event);
                      }}
                      variant={isUserRegistered(event.id, currentUser?.id || '') ? 'outline' : 'default'}
                    >
                      {isUserRegistered(event.id, currentUser?.id || '') ? 'Registered ✓' : 'Register'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Past Events</h2>
          <div className="grid gap-4">
            {pastEvents.map((event) => (
              <Card
                key={event.id}
                className="p-6 opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${EVENT_COLORS[event.category || 'other']}`}>
                        {(event.category || 'other').toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[event.status || 'upcoming']}`}>
                        {(event.status || 'upcoming').toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{event.title}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        {event.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={16} />
                        {event.attendees.length} attended
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <Card
            className="max-w-2xl w-full max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${EVENT_COLORS[selectedEvent.category || 'other']}`}>
                      {(selectedEvent.category || 'other').toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[selectedEvent.status || 'upcoming']}`}>
                      {(selectedEvent.status || 'upcoming').toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">{selectedEvent.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={24} />
                </button>
              </div>

              <p className="text-foreground">{selectedEvent.description}</p>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-primary" />
                  <span className="text-foreground">{selectedEvent.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-primary" />
                  <span className="text-foreground">{selectedEvent.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-primary" />
                  <span className="text-foreground">{selectedEvent.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  <span className="text-foreground">{selectedEvent.attendees.length} / {selectedEvent.maxCapacity} attending</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Created by {selectedEvent.createdByName}</p>
              </div>

              <div className="flex gap-2">
                {currentUser?.role !== 'student' && canEditEvent(selectedEvent) && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      handleDeleteEvent(selectedEvent.id);
                    }}
                  >
                    Delete Event
                  </Button>
                )}
                <Button
                  onClick={() => {
                    handleRegister(selectedEvent);
                    setSelectedEvent(null);
                  }}
                  variant={isUserRegistered(selectedEvent.id, currentUser?.id || '') ? 'outline' : 'default'}
                  className="flex-1"
                >
                  {isUserRegistered(selectedEvent.id, currentUser?.id || '') ? 'Unregister' : 'Register'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedEvent(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
