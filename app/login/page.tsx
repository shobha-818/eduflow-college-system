'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { loginSchema, type LoginInput } from '@/lib/validation';
import { signIn } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentUser, loadInitialData } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSupabaseReachable, setIsSupabaseReachable] = useState<boolean | null>(null);

  // Check connectivity on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Use a simple select to check connectivity instead of a raw fetch to /health
        const { error } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
        if (error && (error.message.includes('fetch') || error.code === 'PGRST301')) {
          throw new Error('Connection failed');
        }
        setIsSupabaseReachable(true);
      } catch (err) {
        console.warn('[EduFlow] Supabase connectivity check failed:', err);
        setIsSupabaseReachable(false);
        toast.error('Database connection error. Please check your internet or VPN.', {
          duration: 5000,
          id: 'supabase-offline-warning'
        });
      }
    };
    checkConnection();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);

    try {
      const result = await signIn(data.email, data.password);

      if (result.user && result.profile) {
        // Double check email verification from profile
        if (result.profile?.email_verified === false) {
          await supabase.auth.signOut();
          toast.error('Please verify your email first');
          return;
        }

        setCurrentUser(result.profile);
        toast.success('Login successful');
        router.push('/dashboard');
        return;
      }

      toast.error('Login failed - please check your credentials');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success('Password reset email sent! Check your inbox.');
      setResetEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-4xl font-bold text-primary mb-2">EduFlow</div>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <Card className="p-8 space-y-6 relative overflow-hidden">
          {isSupabaseReachable === false && (
            <div className="bg-destructive/10 border-b border-destructive/20 -mx-8 -mt-8 mb-6 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                <span className="text-destructive font-bold text-lg">!</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-destructive">Connection Error</p>
                <p className="text-[11px] text-destructive/80 leading-tight">
                  The application cannot connect to the database. This is usually caused by an 
                  <strong> Adblocker</strong>, <strong>VPN</strong>, or <strong>Firewall</strong> blocking Supabase.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="you@college.edu"
                  className="pl-10"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Forgot Password */}
          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={() => setIsResetting(true)}
              className="text-sm text-primary hover:underline"
            >
              Forgot your password?
            </button>
          </div>

          {/* Forgot Password Modal */}
          {isResetting && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-md p-6 space-y-4">
                <h3 className="text-lg font-semibold text-center">Reset Password</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                <Input
                  type="email"
                  placeholder="you@college.edu"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleForgotPassword}
                    disabled={isResetting}
                    className="flex-1"
                  >
                    {isResetting ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsResetting(false);
                      setResetEmail('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}