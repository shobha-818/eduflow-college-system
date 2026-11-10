import { supabase } from './supabase';

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .order('name');

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data;
}

export async function formatAttendeesNames(attendees: string[] | string | undefined | null | any) {
  // SAFETY CHECKS - Handle all bad inputs
  if (!attendees) return '';
  if (typeof attendees === 'object' && !Array.isArray(attendees)) {
    // Catches {} and other objects
    console.warn('formatAttendeesNames received an object:', attendees);
    return '';
  }
  if (attendees === '{}') return '';
  if (attendees === '') return '';
  if (typeof attendees === 'string' && attendees === 'null') return '';
  if (typeof attendees === 'string' && attendees === 'undefined') return '';

  // Convert to array of IDs
  const ids = Array.isArray(attendees)
    ? attendees
    : attendees.split(',').map((id: string) => id.trim()).filter(Boolean);

  // Filter to only valid UUIDs to prevent query errors
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89abAB][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const validIds = ids.filter((id: string) => uuidRegex.test(id));

  if (validIds.length === 0) return '';

  const { data, error } = await supabase
    .from('profiles')
    .select('name')
    .in('id', validIds);

  if (error) {
    console.error('Error formatting attendee names for ids:', validIds, 'error:', error);
    return validIds.join(', ');
  }

  if (!data || data.length === 0) return 'Unknown users';

  return data.map(user => user.name).join(', ');
}