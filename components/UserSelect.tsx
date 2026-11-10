'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  name: string;
  role: string;
  email: string;
}

interface UserSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function UserSelect({ value, onChange, placeholder = "Select a user...", className = "" }: UserSelectProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, role, email')
          .order('name', { ascending: true });

        if (error) throw error;
        setProfiles(data || []);
      } catch (error) {
        console.error('Error fetching profiles:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfiles();
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary outline-none text-foreground ${className}`}
      disabled={loading}
    >
      <option value="">{loading ? 'Loading users...' : placeholder}</option>
      {profiles.map((profile) => {
        const roleLabel = profile.role
          ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
          : 'Unknown';

        return (
          <option key={profile.id} value={profile.id}>
            {profile.name} ({roleLabel})
          </option>
        );
      })}
    </select>
  );
}
