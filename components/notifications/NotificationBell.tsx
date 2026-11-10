'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { supabaseSync } from '@/lib/supabase-sync';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell() {
  const { notifications, unreadNotificationsCount } = useAppStore();
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const handleMarkAsRead = async (id: string) => {
    await supabaseSync.markNotificationAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    if (!unreadNotificationsCount) return;
    setIsMarkingAll(true);
    try {
      await Promise.all(
        notifications
          .filter((notification) => !notification.read)
          .map((notification) => supabaseSync.markNotificationAsRead(notification.id))
      );
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={20} />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
              {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <button
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            onClick={handleMarkAllAsRead}
            disabled={!unreadNotificationsCount || isMarkingAll}
          >
            {isMarkingAll ? 'Marking...' : `${unreadNotificationsCount} unread`}
          </button>
        </div>
        <ScrollArea className="h-80">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-4 flex flex-col items-start gap-1 cursor-pointer ${
                  !notification.read ? 'bg-muted/50' : ''
                }`}
                onClick={() => handleMarkAsRead(notification.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium text-sm">{notification.title}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {notification.message}
                </p>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No notifications yet
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
