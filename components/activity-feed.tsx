'use client';

import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

export function ActivityFeed() {
  const { getLatestActivities } = useAppStore();
  const activities = getLatestActivities(10);

  // Group activities by date
  const today = new Date().toDateString();
  const groupedActivities = {
    today: activities.filter((a) => new Date(a.timestamp).toDateString() === today),
    earlier: activities.filter((a) => new Date(a.timestamp).toDateString() !== today),
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400';
      case 'attendance':
        return 'bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400';
      case 'approval':
        return 'bg-yellow-50 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400';
      case 'announcement':
        return 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400';
      case 'event':
        return 'bg-pink-50 dark:bg-pink-950 text-pink-600 dark:text-pink-400';
      default:
        return 'bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <Card className="p-6 h-full">
      <h2 className="text-lg font-semibold text-foreground mb-6">Activity Feed</h2>

      <div className="space-y-6">
        {/* Today's Activities */}
        {groupedActivities.today.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Today</p>
            {groupedActivities.today.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} colorClass={getActivityColor(activity.type)} />
            ))}
          </div>
        )}

        {/* Earlier Activities */}
        {groupedActivities.earlier.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Earlier</p>
            {groupedActivities.earlier.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} colorClass={getActivityColor(activity.type)} />
            ))}
          </div>
        )}

        {activities.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No activities yet</p>
        )}
      </div>
    </Card>
  );
}

function ActivityItem({
  activity,
  colorClass,
}: {
  activity: any;
  colorClass: string;
}) {
  const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });

  return (
    <Link href={activity.link || '#'}>
      <div className="flex gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg ${colorClass}`}>
          {activity.icon || '•'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground break-words">{activity.message}</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">{activity.user}</p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
