'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'College Overview Dashboard', href: '/dashboard', icon: '📊', roles: ['principal', 'hod', 'faculty', 'student'] },
  { label: 'Attendance Insights', href: '/dashboard/attendance', icon: '✓', roles: ['principal', 'hod', 'faculty'] },
  { label: 'Attendance Report', href: '/dashboard/attendance-report', icon: '📊', roles: ['principal', 'hod'] },
  { label: 'Students', href: '/dashboard/students', icon: '👥', roles: ['principal', 'hod', 'faculty'] },
  { label: 'Timetable', href: '/dashboard/timetable', icon: '📅', roles: ['principal', 'hod', 'faculty', 'student'] },
  { label: 'Announcements', href: '/dashboard/announcements', icon: '📢', roles: ['principal', 'hod', 'faculty', 'student'] },
  { label: 'Tasks', href: '/dashboard/tasks', icon: '✅', roles: ['principal', 'hod', 'faculty'] },
  { label: 'Approvals', href: '/dashboard/approvals', icon: '📋', roles: ['principal', 'hod'] },
  { label: 'Leaves', href: '/dashboard/leaves', icon: '🏖️', roles: ['principal', 'hod', 'faculty', 'student'] },
  { label: 'Meetings', href: '/dashboard/meetings', icon: '🤝', roles: ['principal', 'hod', 'faculty'] },
  { label: 'Analytics & Reports', href: '/dashboard/reports', icon: '📈', roles: ['principal', 'hod'] },
  { label: 'Directory', href: '/dashboard/directory', icon: '📖', roles: ['principal', 'hod', 'faculty', 'student'] },
  { label: 'Chat', href: '/dashboard/chat', icon: '💬', roles: ['principal', 'hod', 'faculty', 'student'] },
  { label: 'Events', href: '/dashboard/events', icon: '🎉', roles: ['principal', 'hod', 'faculty', 'student'] },
  { label: 'User Management', href: '/dashboard/admin/users', icon: '👥', roles: ['principal', 'hod'] },
  { label: 'Bulk Add Users', href: '/dashboard/admin/bulk-add', icon: '📁', roles: ['principal', 'hod'] },
  { label: 'Assign Faculty', href: '/dashboard/assign-faculty', icon: '📚', roles: ['principal', 'hod'] },
  { label: 'Admin Setup', href: '/dashboard/admin/setup', icon: '🛠️', roles: ['principal'] },
  { label: 'Profile', href: '/dashboard/profile', icon: '⚙️', roles: ['principal', 'hod', 'faculty', 'student'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAppStore();
  const [isOpen, setIsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!currentUser) {
    return null;
  }

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(currentUser.role)
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="fixed top-0 left-0 right-0 z-40 md:hidden bg-sidebar border-b border-sidebar-border flex items-center justify-between p-4">
        <div className="text-lg font-bold text-sidebar-foreground">EduFlow</div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-sidebar-foreground"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 bg-sidebar border-r border-sidebar-border transition-all duration-300 z-50 overflow-y-auto',
          'md:relative md:translate-x-0 md:z-0',
          !isOpen ? '-translate-x-full' : 'translate-x-0',
          isCollapsed ? 'md:w-16' : 'md:w-64',
          'w-64'
        )}
      >
        <div className={cn(
          'p-6 hidden md:flex items-center justify-between',
          isCollapsed && 'px-3'
        )}>
          {!isCollapsed && (
            <div>
              <h1 className="text-2xl font-bold text-sidebar-foreground">EduFlow</h1>
              <p className="text-sm text-sidebar-foreground/60 mt-1">College Management</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </Button>
          </div>
        </div>

        {/* User Profile Section */}
        <div className={cn(
          'mx-4 mt-12 md:mt-0 p-4 rounded-lg bg-sidebar-accent/10 border border-sidebar-border',
          isCollapsed && 'mx-2 px-2'
        )}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center flex-shrink-0">
              <User size={20} className="text-sidebar-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div className="flex-1">
                <p className="text-sm font-semibold text-sidebar-foreground">{currentUser.name}</p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{currentUser.role}</p>
                {currentUser.department && (
                  <p className="text-xs text-sidebar-foreground/60">{currentUser.department}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={cn(
          'p-4 flex flex-col h-[calc(100vh-280px)]',
          isCollapsed && 'p-2'
        )}>
          <div className="space-y-2 flex-1">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium',
                    isCollapsed && 'px-2 justify-center',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="text-lg">{item.icon}</span>
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* Logout */}
          <div className={cn(
            'border-t border-sidebar-border pt-4 mt-4 space-y-2',
            isCollapsed && 'pt-2'
          )}>
            <button
              onClick={async () => {
                await logout();
                router.push('/');
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium',
                isCollapsed && 'px-2 justify-center',
                'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
              title={isCollapsed ? 'Logout' : undefined}
            >
              <LogOut size={18} />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
