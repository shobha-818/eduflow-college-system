'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { toast } from 'sonner';

import {
  loginSchema,
  type LoginInput,
} from '@/lib/validation';

import { signIn } from '@/services/auth';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import {
  Lock,
  Mail,
  User,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentUser, loadInitialData } = useAppStore();

  const [isLoading, setIsLoading] =
    useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),

    defaultValues: {
      email: '',
      password: '',
      role: 'student',
    },
  });

  const onSubmit = async (
    data: LoginInput
  ) => {
    setIsLoading(true);

    try {
      const { profile } = await signIn(
        data.email,
        data.password,
        data.role
      );

      if (!profile) {
        throw new Error('Unable to load account profile.');
      }

      setCurrentUser(profile);
      await loadInitialData();

      toast.success('Login successful');
      router.push('/dashboard');

    } catch (error: any) {

      toast.error(
        error.message ||
          'Login failed'
      );

    } finally {

      setIsLoading(false);

    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">

      <div className="w-full max-w-md space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">

          <div className="text-4xl font-bold text-primary mb-2">
            EduFlow
          </div>

          <h1 className="text-3xl font-bold text-foreground">
            Welcome Back
          </h1>

          <p className="text-muted-foreground">
            College Management System
          </p>

        </div>

        {/* Login Form */}
        <Card className="p-6 space-y-6">

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >

            {/* Email */}
            <div className="space-y-2">

              <label className="text-sm font-medium text-foreground flex items-center gap-2">

                <Mail size={16} />

                Email Address

              </label>

              <input
                {...register('email')}
                type="email"
                placeholder="you@college.edu"
                suppressHydrationWarning
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
              />

              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}

            </div>

            {/* Password */}
            <div className="space-y-2">

              <label className="text-sm font-medium text-foreground flex items-center gap-2">

                <Lock size={16} />

                Password

              </label>

              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                suppressHydrationWarning
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
              />

              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}

            </div>

            {/* Role */}
            <div className="space-y-2">

              <label className="text-sm font-medium text-foreground flex items-center gap-2">

                <User size={16} />

                Role

              </label>

              <select
                {...register('role')}
                suppressHydrationWarning
                className="w-full px-4 py-2 rounded-lg bg-input border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition text-foreground"
              >

                <option value="principal">
                  Principal
                </option>

                <option value="hod">
                  Head of Department
                </option>

                <option value="faculty">
                  Faculty
                </option>

                <option value="student">
                  Student
                </option>

              </select>

              {errors.role && (
                <p className="text-sm text-destructive">
                  {errors.role.message}
                </p>
              )}

            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              suppressHydrationWarning
              className="w-full mt-6"
            >

              {isLoading
                ? 'Signing In...'
                : 'Sign In'}

            </Button>

          </form>

        </Card>

        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Create one now
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            Professional college management system for educational institutions
          </p>
        </div>

      </div>

    </div>
  );
}