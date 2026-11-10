'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Sidebar } from '@/components/sidebar';
import { supabaseSync } from '@/lib/supabase-sync';
import { supabase } from '@/lib/supabase';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { currentUser, loadSessionData, loadInitialData } = useAppStore();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let unsubscribeNotifications: (() => void) | undefined;
    let presenceChannel: any;

    const initialize = async () => {
      const user = await loadSessionData();

      if (!user) {
        router.push('/');
        return;
      }

      await loadInitialData();
      unsubscribe = supabaseSync.subscribeAll();
      unsubscribeNotifications = await supabaseSync.subscribeToNotifications();

      // Presence Tracking
      const cleanupPresence = async () => {
        const channels = supabase.getChannels();
        for (const c of channels) {
          if (c.topic.includes('presence') || c.topic.includes('online-users')) {
            await supabase.removeChannel(c);
          }
        }
      };

      await cleanupPresence();

      presenceChannel = supabase.channel(`presence-sync-${user.id}-${Math.random().toString(36).slice(2, 9)}`, {
        config: { presence: { key: user.id } }
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          useAppStore.setState({ onlineUsers: Object.keys(state) });
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            });
          }
        });
    };

    initialize();

    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubscribeNotifications) unsubscribeNotifications();
      if (presenceChannel) presenceChannel.unsubscribe();
    };
  }, [loadSessionData, loadInitialData, router]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
