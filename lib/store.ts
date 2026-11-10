import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { supabaseSync } from '@/lib/supabase-sync';
import { signIn } from '@/services/auth';

export type UserRole = 'principal' | 'hod' | 'faculty' | 'student';

const mapProfile = (profile: any): User => ({
  id: profile.id,
  name: profile.name || '',
  email: profile.email || '',
  role: profile.role as UserRole,
  department: profile.department || undefined,
  departmentId: profile.department_id || undefined,
  semester: profile.semester ?? undefined,
  phone: profile.phone || undefined,
  address: profile.address || undefined,
  avatar_url: profile.avatar_url || undefined,
  online: profile.online,
  last_seen: profile.last_seen,
});

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  departmentId?: string;
  semester?: number;
  phone?: string;
  address?: string;
  avatar_url?: string;
  online?: boolean;
  last_seen?: string;
}

// In lib/store.ts - Update Attendance interface
interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  attendanceDate: string;
  status: 'present' | 'absent' | 'late';
  subject: string;           // ← Already exists
  subjectId?: string;        // ← ADD THIS LINE (optional)
  classId?: string;          // ← ADD THIS
  department?: string;
  departmentId?: string;     // ← ADD THIS
  topicCovered?: string;      // ← ADD THIS
  facultyId?: string;         // ← ADD THIS
  facultyName?: string;       // ← ADD THIS
  createdAt?: string;         // ← ADD THIS
}

export interface Student {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  department: string;
  semester: number;
  gpa: number;
  phone: string;
  address: string;
  enrollmentDate: string;
}

export interface TimeSlot {
  id: string;
  dayOfWeek: number; // 0-5 (Mon-Sat)
  startTime: string;
  endTime: string;
  subject: string;
  faculty: string;
  room: string;
  semester: number;
  department: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: 'all' | 'faculty' | 'students' | 'department';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  createdBy: string;
  attachments?: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedBy: string;
  department?: string;
  status: 'pending' | 'in-progress' | 'completed';
  deadline: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  createdBy: string;
  overdue?: boolean;
  assignedToName?: string;
  assignedByName?: string;
}

export interface Leave {
  id: string;
  applicantId: string;
  applicantName: string;
  type: 'sick' | 'casual' | 'earned';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'hod_approved' | 'approved' | 'rejected';
  approvedBy?: string;
  appliedAt: string;
  applicantEmail?: string;
  department?: string;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  attendees: string[];
  dateTime: string;
  duration: number;
  location: string;
  createdBy: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type?: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface Activity {
  id: string;
  message: string;
  type: 'task' | 'attendance' | 'approval' | 'event' | 'announcement';
  user: string;
  timestamp: string;
  icon?: string;
  link?: string;
}

export interface Approval {
  id: string;
  type: 'leave' | 'request' | 'document';
  requestedBy: string;
  requestedByName: string;
  department: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  title: string;
  description: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  category: 'academic' | 'sports' | 'cultural' | 'workshop' | 'other';
  date: string;
  time: string;
  location: string;
  department: string;
  createdBy: string;
  createdByName: string;
  attendees: string[];
  maxCapacity: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  hodId?: string;
  createdAt: string;
}

export interface Class {
  id: string;
  name: string;
  departmentId: string;
  semester: number;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  semester: number;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  read?: boolean;
  sender?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name?: string;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  createdBy: string;
  createdAt: string;
  participants: string[]; // User IDs
  otherUser?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  } | null;
}



interface AppStore {
  // User Management
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  loadSessionData: () => Promise<User | null>;
  loadInitialData: () => Promise<void>;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;

  // Attendance
  attendanceRecords: Attendance[];
  addAttendance: (record: Attendance) => void;
  getAttendancePercentage: (studentId: string) => number;
  getVisibleAttendanceRecords: () => Attendance[];

  // Students
  students: Student[];
  addStudent: (student: Student) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  deleteStudent: (id: string) => void;

  // Real-time Presence
  onlineUsers: string[];
  
  // Notifications
  notifications: Notification[];
  unreadNotificationsCount: number;
  
  // Chat
  messages: Message[];
  conversations: Conversation[];
  setMessages: (messages: Message[]) => void;

  // Timetable
  timeSlots: TimeSlot[];
  addTimeSlot: (slot: TimeSlot) => void;
  updateTimeSlot: (id: string, updates: Partial<TimeSlot>) => void;
  deleteTimeSlot: (id: string) => void;

  // Announcements
  announcements: Announcement[];
  addAnnouncement: (announcement: Announcement) => void;

  // Tasks
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  getVisibleTasks: () => Task[];
  getOverdueTasks: () => Task[];
  getTaskStats: () => { total: number; pending: number; inProgress: number; completed: number; overdue: number };

  // Leaves
  leaves: Leave[];
  applyLeave: (leave: Leave) => void;
  updateLeaveStatus: (id: string, status: 'hod_approved' | 'approved' | 'rejected', approvedBy: string) => void;

  // Meetings
  meetings: Meeting[];
  addMeeting: (meeting: Meeting) => void;

  // Notifications methods
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (id: string) => void;

  // Activity Logs
  activities: Activity[];
  addActivity: (activity: Activity) => void;
  getLatestActivities: (limit?: number) => Activity[];

  // Approvals
  approvals: Approval[];
  addApproval: (approval: Approval) => void;
  updateApprovalStatus: (id: string, status: 'approved' | 'rejected', approvedBy: string) => void;
  getPendingApprovals: () => Approval[];

  // Events
  events: Event[];
  addEvent: (event: Event) => void;
  registerForEvent: (eventId: string, userId: string) => void;
  unregisterFromEvent: (eventId: string, userId: string) => void;
  updateEventStatus: (eventId: string, status: 'upcoming' | 'ongoing' | 'completed') => void;
  deleteEvent: (eventId: string) => void;
  getEventStats: () => { total: number; upcoming: number; participants: number };
  getVisibleEvents: () => Event[];
  isUserRegistered: (eventId: string, userId: string) => boolean;

  // Departments, Classes, Subjects
  departments: Department[];
  classes: Class[];
  subjects: Subject[];
}

const generateMockData = () => ({
  currentUser: null,
  attendanceRecords: [] as Attendance[],
  students: [] as Student[],
  timeSlots: [] as TimeSlot[],
  announcements: [] as Announcement[],
  tasks: [] as Task[],
  leaves: [] as Leave[],
  meetings: [] as Meeting[],
  notifications: [] as Notification[],
  activities: [] as Activity[],
  approvals: [] as Approval[],
  events: [] as Event[],
  departments: [] as Department[],
  classes: [] as Class[],
  subjects: [] as Subject[],
  unreadNotificationsCount: 0,
});

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...generateMockData(),

        setCurrentUser: (user) => set({ currentUser: user }),
        setMessages: (messages) => set({ messages }),

        // Real-time & Social
        onlineUsers: [],
        notifications: [],
        unreadNotificationsCount: 0,
        messages: [],
        conversations: [],

        loadSessionData: async () => {
          try {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
              console.error('[EduFlow] Supabase session load failed:', error?.message || String(error));
              return null;
            }

            if (!data.session?.user) {
              return null;
            }

            const authUser = data.session.user;

            // Helper to fetch profile with a single retry for transient errors
            const fetchProfile = async (retry = false): Promise<any> => {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle();

              if (profileError) {
                const isMissingProfile =
                  profileError.message?.includes('No rows found') ||
                  profileError.code === 'PGRST116';

                if (isMissingProfile) {
                  console.warn('[EduFlow] No profile row found for authenticated user', authUser.id);
                  return null;
                }

                // Retry once for transient errors (schema cache, RLS refresh, etc.)
                if (!retry) {
                  console.warn(
                    '[EduFlow] Profile load failed, retrying...',
                    `code=${profileError.code || 'unknown'}`,
                    `message=${profileError.message || 'unknown'}`,
                    `details=${profileError.details || 'none'}`,
                    `hint=${(profileError as any).hint || 'none'}`
                  );
                  await new Promise((r) => setTimeout(r, 1000));
                  return fetchProfile(true);
                }

                console.error(
                  '[EduFlow] Profile load failed after retry:',
                  `userId=${authUser.id}`,
                  `code=${profileError.code || 'unknown'}`,
                  `message=${profileError.message || 'unknown'}`,
                  `details=${profileError.details || 'none'}`,
                  `hint=${(profileError as any).hint || 'none'}`
                );
                return null;
              }

              return profile;
            };

            const profile = await fetchProfile();

            if (!profile) {
              console.warn('[EduFlow] No profile found for user:', authUser.id);
              return null;
            }

            const user = mapProfile(profile);
            set({ currentUser: user });
            return user;
          } catch (err: any) {
            // Gracefully handle network errors (e.g., "Failed to fetch" during offline/cold start)
            console.warn('[EduFlow] loadSessionData: network error, session not restored.', err?.message);
            return null;
          }
        },

        loadInitialData: async () => {
          // Run all syncs concurrently
          await Promise.allSettled([
            supabaseSync.syncStudents(),
            supabaseSync.syncAttendance(),
            supabaseSync.syncAnnouncements(),
            supabaseSync.syncTasks(),
            supabaseSync.syncLeaves(),
            supabaseSync.syncEvents(),
            supabaseSync.syncTimeSlots(),
            supabaseSync.syncApprovals(),
            supabaseSync.syncConversations(),
            supabaseSync.syncNotifications(),
            supabaseSync.syncDepartments(),
            supabaseSync.syncClasses(),
            supabaseSync.syncSubjects(),
            supabaseSync.syncMeetings(),
          ]);
        },

        login: async (email, password, role) => {
          const { profile } = await signIn(email, password, role);
          if (profile) {
            set({ currentUser: profile });
          }
        },

        logout: async () => {
          await supabase.auth.signOut();
          set({
            currentUser: null,
            students: [],
            attendanceRecords: [],
            announcements: [],
            tasks: [],
            leaves: [],
            meetings: [],
            events: [],
            timeSlots: [],
            approvals: [],
            conversations: [],
            messages: [],
          });
        },

        addAttendance: (record) => {
          set((state) => {
            const enrichedRecord = {
              ...record,
              facultyName: state.currentUser?.name || record.facultyName,
              department: state.currentUser?.department || record.department,
            };
            return { attendanceRecords: [...state.attendanceRecords, enrichedRecord] };
          });
        },

        getAttendancePercentage: (studentId) => {
          const state = get();
          const records = state.attendanceRecords.filter((r) => r.studentId === studentId);
          if (records.length === 0) return 0;
          const present = records.filter((r) => r.status === 'present').length;
          return Math.round((present / records.length) * 100);
        },

        getVisibleAttendanceRecords: () => {
          const state = get();
          const { currentUser, attendanceRecords } = state;
          
          if (!currentUser) return [];
          
          // Principal sees all attendance
          if (currentUser.role === 'principal') {
            return attendanceRecords;
          }
          
          // HOD sees department attendance
          if (currentUser.role === 'hod' && currentUser.department) {
            return attendanceRecords.filter((r) => r.department === currentUser.department);
          }
          
          // Faculty sees their own attendance records
          if (currentUser.role === 'faculty') {
            return attendanceRecords.filter((r) => r.facultyId === currentUser.id);
          }
          
          // Student sees their own attendance
          if (currentUser.role === 'student') {
            return attendanceRecords.filter((r) => r.studentId === currentUser.id);
          }
          
          return [];
        },

        addStudent: (student) => set((state) => ({ students: [...state.students, student] })),

        updateStudent: (id, updates) =>
          set((state) => ({
            students: state.students.map((s) => (s.id === id ? { ...s, ...updates } : s)),
          })),

        deleteStudent: (id) =>
          set((state) => ({
            students: state.students.filter((s) => s.id !== id),
          })),

        addTimeSlot: (slot) => set((state) => ({ timeSlots: [...state.timeSlots, slot] })),

        updateTimeSlot: (id, updates) =>
          set((state) => ({
            timeSlots: state.timeSlots.map((ts) => (ts.id === id ? { ...ts, ...updates } : ts)),
          })),

        deleteTimeSlot: (id) =>
          set((state) => ({
            timeSlots: state.timeSlots.filter((ts) => ts.id !== id),
          })),

        addAnnouncement: (announcement) =>
          set((state) => ({ 
            announcements: [
              announcement, 
              ...state.announcements.filter(a => a.id !== announcement.id)
            ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          })),

        addTask: (task) => 
          set((state) => ({ 
            tasks: [
              task, 
              ...state.tasks.filter(t => t.id !== task.id)
            ] 
          })),

        updateTask: (id, updates) =>
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
          })),

        getVisibleTasks: () => {
          const state = get();
          const { currentUser, tasks } = state;
          
          if (!currentUser) return [];
          
          // Principal sees all tasks
          if (currentUser.role === 'principal') {
            return tasks;
          }
          
          // HOD sees tasks assigned to them and department tasks
          if (currentUser.role === 'hod') {
            return tasks.filter((t) => t.assignedTo === currentUser.id);
          }
          
          // Faculty sees tasks assigned to them
          if (currentUser.role === 'faculty') {
            return tasks.filter((t) => t.assignedTo === currentUser.id);
          }
          
          // Student sees tasks assigned to them
          if (currentUser.role === 'student') {
            return tasks.filter((t) => t.assignedTo === currentUser.id);
          }
          
          return [];
        },

        getOverdueTasks: () => {
          const state = get();
          const visibleTasks = state.getVisibleTasks();
          const today = new Date().toISOString().split('T')[0];
          return visibleTasks.filter((t) => t.deadline < today && t.status !== 'completed');
        },

        getTaskStats: () => {
          const state = get();
          const visibleTasks = state.getVisibleTasks();
          return {
            total: visibleTasks.length,
            pending: visibleTasks.filter((t) => t.status === 'pending').length,
            inProgress: visibleTasks.filter((t) => t.status === 'in-progress').length,
            completed: visibleTasks.filter((t) => t.status === 'completed').length,
            overdue: state.getOverdueTasks().length,
          };
        },

        applyLeave: (leave) => set((state) => ({ leaves: [...state.leaves, leave] })),

        updateLeaveStatus: (id, status, approvedBy) =>
          set((state) => ({
            leaves: state.leaves.map((l) => (l.id === id ? { ...l, status, approvedBy } : l)),
          })),

        addMeeting: (meeting) => set((state) => ({ meetings: [...state.meetings, meeting] })),

        addNotification: (notification) =>
          set((state) => ({
            notifications: [...state.notifications, notification],
            unreadNotificationsCount: state.unreadNotificationsCount + 1,
          })),

        markNotificationAsRead: (id) =>
          set((state) => ({
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadNotificationsCount: Math.max(0, state.unreadNotificationsCount - 1),
          })),



        addActivity: (activity) =>
          set((state) => ({
            activities: [activity, ...state.activities],
          })),

        getLatestActivities: (limit = 10) => {
          const state = get();
          const activities: any[] = [];
          const seenIds = new Set<string>();

          // Announcements
          state.announcements.forEach((a) => {
            const activityId = `ann-${a.id}`;
            if (!seenIds.has(activityId)) {
              seenIds.add(activityId);
              activities.push({
                id: activityId,
                type: 'announcement',
                message: `Announcement: ${a.title}`,
                user: 'System',
                timestamp: a.createdAt,
                icon: '📢',
                link: '/dashboard/announcements',
              });
            }
          });

          // Tasks
          state.tasks.forEach((t) => {
            const activityId = `task-${t.id}`;
            if (!seenIds.has(activityId)) {
              seenIds.add(activityId);
              activities.push({
                id: activityId,
                type: 'task',
                message: `Task ${t.status}: ${t.title}`,
                user: t.assignedTo,
                timestamp: t.createdAt,
                icon: '✅',
                link: '/dashboard/tasks',
              });
            }
          });

          // Leaves
          state.leaves.forEach((l) => {
            const activityId = `leave-${l.id}`;
            if (!seenIds.has(activityId)) {
              seenIds.add(activityId);
              activities.push({
                id: activityId,
                type: 'approval',
                message: `Leave Request (${l.status})`,
                user: l.applicantId,
                timestamp: l.appliedAt,
                icon: '🏖️',
                link: '/dashboard/leaves',
              });
            }
          });

          return activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);
        },

        addApproval: (approval) =>
          set((state) => ({
            approvals: [...state.approvals, approval],
          })),

        updateApprovalStatus: (id, status, approvedBy) =>
          set((state) => ({
            approvals: state.approvals.map((a) =>
              a.id === id
                ? {
                    ...a,
                    status,
                    approvedBy,
                    approvedAt: new Date().toISOString(),
                  }
                : a
            ),
          })),

        getPendingApprovals: () => {
          const state = get();
          const { currentUser, approvals } = state;

          if (!currentUser) return [];

          if (currentUser.role === 'principal') {
            return approvals.filter((a) => a.status === 'pending');
          }

          if (currentUser.role === 'hod' && currentUser.department) {
            return approvals.filter(
              (a) => a.status === 'pending' && a.department === currentUser.department
            );
          }

          return [];
        },

        // Event Management Methods
        addEvent: (event) => {
          set((state) => ({
            events: [
              event,
              ...state.events.filter(e => e.id !== event.id)
            ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          }));
          // Log activity
          get().addActivity({
            id: `act-${Date.now()}`,
            message: `Event "${event.title}" created by ${event.createdByName}`,
            type: 'event',
            user: event.createdByName,
            timestamp: new Date().toISOString(),
            icon: '🎉',
            link: '/dashboard/events',
          });
          // Add notification
          get().addNotification({
            id: `notif-${Date.now()}`,
            userId: 'all',
            title: 'New Event',
            message: `New event: ${event.title} on ${event.date}`,
            type: 'event',
            read: false,
            createdAt: new Date().toISOString(),
            link: '/dashboard/events',
          });
        },

        registerForEvent: (eventId, userId) => {
          set((state) => ({
            events: state.events.map((e) =>
              e.id === eventId
                ? { ...e, attendees: [...new Set([...e.attendees, userId])] }
                : e
            ),
          }));
          const event = get().events.find((e) => e.id === eventId);
          if (event) {
            get().addActivity({
              id: `act-${Date.now()}`,
              message: `User registered for event "${event.title}"`,
              type: 'event',
              user: get().currentUser?.name || 'User',
              timestamp: new Date().toISOString(),
              icon: '✓',
              link: '/dashboard/events',
            });
            get().addNotification({
              id: `notif-${Date.now()}`,
              userId,
              title: 'Event Registration',
              message: `You registered for ${event.title}`,
              type: 'event',
              read: false,
              createdAt: new Date().toISOString(),
              link: '/dashboard/events',
            });
          }
        },

        unregisterFromEvent: (eventId, userId) => {
          set((state) => ({
            events: state.events.map((e) =>
              e.id === eventId
                ? { ...e, attendees: e.attendees.filter((a) => a !== userId) }
                : e
            ),
          }));
        },

        updateEventStatus: (eventId, status) => {
          set((state) => ({
            events: state.events.map((e) =>
              e.id === eventId ? { ...e, status } : e
            ),
          }));
        },

        deleteEvent: (eventId) => {
          const event = get().events.find((e) => e.id === eventId);
          set((state) => ({
            events: state.events.filter((e) => e.id !== eventId),
          }));
          if (event) {
            get().addActivity({
              id: `act-${Date.now()}`,
              message: `Event "${event.title}" deleted`,
              type: 'event',
              user: get().currentUser?.name || 'Admin',
              timestamp: new Date().toISOString(),
              icon: '🗑️',
              link: '/dashboard/events',
            });
          }
        },

        getEventStats: () => {
          const state = get();
          const today = new Date().toISOString().split('T')[0];
          const upcomingEvents = state.events.filter((e) => e.date >= today);
          const totalParticipants = new Set(state.events.flatMap((e) => e.attendees)).size;
          return {
            total: state.events.length,
            upcoming: upcomingEvents.length,
            participants: totalParticipants,
          };
        },

        getVisibleEvents: () => {
          const state = get();
          // All users can see all events
          return state.events;
        },

        isUserRegistered: (eventId, userId) => {
          const state = get();
          const event = state.events.find((e) => e.id === eventId);
          return event ? event.attendees.includes(userId) : false;
        },
      }),
      {
        name: 'eduflow-store',
        version: 2,
        migrate: (persistedState: any, version: number) => {
          if (version === 1) {
            // Perform transformation if needed, or just return the state
            return persistedState;
          }
          return persistedState;
        },
      }
    )
  )
);
