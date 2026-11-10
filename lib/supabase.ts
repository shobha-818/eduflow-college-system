import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()
const missingConfig = !supabaseUrl || !supabaseAnonKey

if (missingConfig) {
  console.error(
    '[EduFlow] Missing Supabase env config. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
  )
} else if (typeof window !== 'undefined') {
  console.log('[EduFlow] Supabase client initialized:', supabaseUrl)
}

function initSupabaseClient() {
  if (missingConfig) {
    throw new Error(
      '[EduFlow] Missing Supabase configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}

// Singleton browser client — shared across all client components
export const supabase = initSupabaseClient()

// Factory for creating fresh clients when needed
export const createClient = initSupabaseClient