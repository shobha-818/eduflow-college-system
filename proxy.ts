import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session — wrapped in try/catch so a Supabase network outage
  // ("Failed to fetch") doesn't crash the middleware and block every page.
  let user: any = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error) {
      user = data.user;
    } else {
      console.warn('[proxy] supabase.auth.getUser() error:', error.message);
    }
  } catch (err: any) {
    // Network-level failure (e.g. Supabase unreachable). Log and continue
    // without a user — protected routes will redirect to login.
    console.warn('[proxy] supabase.auth.getUser() threw:', err?.message);
  }

  const pathname = request.nextUrl.pathname

  // Public paths
  if (pathname === '/' || pathname === '/register') {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  // Protected paths
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Check if user is approved
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_approved, role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.warn('[proxy] profile check error:', profileError.message);
        // If profile not found, might be a fresh signup, let it through to handle in-page
      }

      if (profile && profile.is_approved === false) {
        return NextResponse.redirect(new URL('/pending-approval', request.url))
      }
    } catch (err: any) {
      console.error('[proxy] Critical error in profile check:', err?.message);
    }
  }

  // Redirect from pending-approval if already approved or not logged in
  if (pathname === '/pending-approval') {
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('id', user.id)
        .single()
      
      if (profile && profile.is_approved !== false) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch {
      // If profile check fails, stay on pending-approval page
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
