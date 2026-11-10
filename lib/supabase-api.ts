import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Canonical shape of a server-side profile.
 * All fields that any API route accesses must be listed here.
 */
export type ServerProfile = {
  id: string;
  name: string;
  role: string;
  department: string | null;
  department_id?: string | null;
};

/**
 * Fetches the current user's profile from the `profiles` table.
 * Falls back to JWT user_metadata / app_metadata when RLS silently blocks
 * the row read (maybeSingle returns null with no error).
 *
 * @param supabase  - server-side Supabase client (from createClient())
 * @param user      - auth user object (from supabase.auth.getUser())
 * @param fields    - columns to select (default: 'id, name, role, department')
 * @returns ServerProfile or null if neither DB row nor metadata is available
 */
export async function getServerProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; user_metadata?: Record<string, any>; app_metadata?: Record<string, any> },
  fields = 'id, name, role, department'
): Promise<ServerProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(fields)
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('[getServerProfile] DB lookup error:', error.message, '– falling back to JWT metadata');
  }

  // `data` from maybeSingle can be the row object, null, or a GenericStringError.
  // We treat anything that is a plain object with an `id` field as a valid row.
  if (data && typeof data === 'object' && 'id' in data) {
    return data as unknown as ServerProfile;
  }

  // Fallback: reconstruct minimal profile from JWT claims
  const metaRole: string =
    (user.user_metadata?.role as string) ||
    (user.app_metadata?.role as string) ||
    '';

  const metaName: string =
    (user.user_metadata?.name as string) ||
    (user.user_metadata?.full_name as string) ||
    '';

  const metaDepartment: string =
    (user.user_metadata?.department as string) || '';

  if (!metaRole) return null;

  console.warn('[getServerProfile] Using JWT metadata fallback for user:', user.id, '| role:', metaRole);

  return {
    id: user.id,
    name: metaName,
    role: metaRole,
    department: metaDepartment || null,
  };
}
