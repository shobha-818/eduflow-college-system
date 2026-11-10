'use client';

import { useEffect } from 'react';
import { supabaseSync } from '@/lib/supabase-sync';
import { useAppStore } from '@/lib/store';

export function useRealtime() {
  const { currentUser } = useAppStore();

  useEffect(() => {
    if (!currentUser) return;

    // Initialize all subscriptions
    const unsubscribe = supabaseSync.subscribeAll();

    // Cleanup on unmount
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [currentUser]);
}
