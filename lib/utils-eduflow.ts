// Format utilities
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTime = (timeString: string) => {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Day utilities
export const getDayName = (dayOfWeek: number): string => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || 'Unknown';
};

// Attendance utilities
export const getAttendanceColor = (percentage: number): string => {
  if (percentage >= 75) return 'text-green-600 dark:text-green-400';
  if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

export const getAttendanceStatus = (percentage: number): 'good' | 'warning' | 'danger' => {
  if (percentage >= 75) return 'good';
  if (percentage >= 60) return 'warning';
  return 'danger';
};

// Task utilities
export const getTaskColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    case 'in-progress':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    case 'pending':
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
  }
};

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'high':
      return 'text-red-600 dark:text-red-400';
    case 'medium':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'low':
      return 'text-green-600 dark:text-green-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

export const getPriorityBg = (priority: string): string => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    case 'medium':
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    case 'low':
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    default:
      return 'bg-gray-100 dark:bg-gray-800';
  }
};

// Leave utilities
export const getLeaveStatus = (status: string): string => {
  switch (status) {
    case 'approved':
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    case 'rejected':
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    case 'pending':
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    default:
      return 'bg-gray-100 dark:bg-gray-800';
  }
};

// Calculate duration
export const calculateDuration = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Percentage calculation
export const calculatePercentage = (current: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
};

// Filter helpers
export const filterByDepartment = <T extends { department: string }>(items: T[], department: string): T[] => {
  return items.filter((item) => item.department === department);
};

export const filterBySemester = <T extends { semester: number }>(items: T[], semester: number): T[] => {
  return items.filter((item) => item.semester === semester);
};

// Search helpers
export const searchByName = <T extends { name: string }>(items: T[], query: string): T[] => {
  if (!query) return items;
  return items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
};

export const searchByEmail = <T extends { email: string }>(items: T[], query: string): T[] => {
  if (!query) return items;
  return items.filter((item) => item.email.toLowerCase().includes(query.toLowerCase()));
};

// Sort helpers
export const sortByDate = <T extends { createdAt: string }>(items: T[], order: 'asc' | 'desc' = 'desc'): T[] => {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
};

// Time slot conflict detection
export const hasTimeConflict = (
  slot1: { startTime: string; endTime: string },
  slot2: { startTime: string; endTime: string }
): boolean => {
  const [s1start, s1end] = [slot1.startTime, slot1.endTime].map((t) => parseInt(t.replace(':', '')));
  const [s2start, s2end] = [slot2.startTime, slot2.endTime].map((t) => parseInt(t.replace(':', '')));
  return s1start < s2end && s2start < s1end;
};

// Statistics helpers
export const calculateStats = (
  items: Array<{ status: string }>,
  statuses: string[]
): Record<string, number> => {
  const stats: Record<string, number> = {};
  statuses.forEach((status) => {
    stats[status] = items.filter((item) => item.status === status).length;
  });
  return stats;
};
