import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/lib/store';

export interface AuthProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  email_verified?: boolean;
  is_approved?: boolean;
  department?: string;
  semester?: number;
  phone?: string;
  address?: string;
  avatar?: string;
}

const mapProfile = (profile: any): AuthProfile => ({
  id: profile.id,
  name: profile.name || '',
  email: profile.email || '',
  role: profile.role || 'student',
  email_verified: profile.email_verified ?? false,
  is_approved: profile.is_approved ?? true,
  department: profile.department || undefined,
  semester: profile.semester ?? undefined,
  phone: profile.phone || undefined,
  address: profile.address || undefined,
  avatar: profile.avatar || undefined,
});

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  return mapProfile(data);
}

export async function signIn(
  email: string,
  password: string,
  role?: string
) {
  const maxRetries = 2;
  let retryCount = 0;

  async function attemptSignIn(): Promise<any> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // If it's a network error and we have retries left, wait and retry
        const isNetworkError = 
          error.message?.includes('Failed to fetch') || 
          error.name === 'AuthRetryableFetchError' ||
          (error as any).status === 0;

        if (isNetworkError && retryCount < maxRetries) {
          retryCount++;
          console.warn(`[EduFlow] SignIn network error, retry ${retryCount}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          return attemptSignIn();
        }

        console.error('Login error detail:', {
          message: error.message,
          status: (error as any).status,
          name: error.name
        });
        throw error;
      }

      if (!data.session?.user) {
        throw new Error('Login did not create a valid session.');
      }

      const profile = await getProfile(data.user.id);

      if (!profile) {
        throw new Error('User profile not found.');
      }

      if (profile.email_verified === false) {
        throw new Error('Please verify your email address before signing in. Check your inbox for the verification link.');
      }

      if (profile.is_approved === false) {
        throw new Error('Your account is pending admin approval.');
      }

      if (role && profile.role !== role) {
        throw new Error('Selected role does not match your account.');
      }

      return { user: data.user, profile };
    } catch (err: any) {
      // Re-check for network errors in the caught block
      const isNetworkError = 
        err?.message?.includes('Failed to fetch') || 
        err?.name === 'TypeError' || 
        err?.name === 'AuthRetryableFetchError' ||
        err?.status === 0;

      if (isNetworkError) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`[EduFlow] SignIn catch network error, retry ${retryCount}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          return attemptSignIn();
        }
        throw new Error('Network connection failure. Please check your internet, VPN, or disable Adblockers and try again.');
      }
      throw err;
    }
  }

  return attemptSignIn();
}

export async function signUp(
  name: string,
  email: string,
  password: string,
  role: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  const userId = data.user?.id;

  if (!userId) {
    throw new Error('Unable to create user account.');
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      name,
      email,
      role,
    });

  if (profileError) {
    throw profileError;
  }

  const profile = mapProfile({
    id: userId,
    name,
    email,
    role,
  });

  return {
    profile,
    session: data.session,
  };
}

export async function logout() {
  await supabase.auth.signOut();
}