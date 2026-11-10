'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    console.log('VerifyEmailPage mounted. Params:', { token: !!token, email });
    if (token && email) {
      verifyEmail();
    } else {
      // If params are missing, show error
      setStatus('error');
      setMessage('Invalid verification link - missing parameters');
    }
  }, [token, email]);

  const verifyEmail = async () => {
    try {
      console.log(`Verifying email for: ${email}`);

      // Update profiles table
      // We check both email and token to ensure validity
      const { data, error } = await supabase
        .from('profiles')
        .update({ email_verified: true })
        .eq('email', email)
        .eq('verification_token', token)
        .select();

      if (error) {
        console.error('Database Error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('No profile found to update with these credentials');
        throw new Error('Invalid or expired verification link');
      }

      console.log('Verification success:', data);
      setStatus('success');
      setMessage('Email verified successfully! You can now login.');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (error: any) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage(error.message || 'Verification failed. Link may be invalid or expired.');
    }
  };


  return (
    <Card className="w-full max-w-md p-8 text-center shadow-xl border-none bg-white/80 backdrop-blur-sm">
      {status === 'loading' && (
        <div className="animate-in fade-in duration-500">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-800">Verifying your email...</h2>
          <p className="text-gray-500 mt-2">Please wait while we activate your account.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="animate-in zoom-in duration-500">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-green-600">Email Verified!</h2>
          <p className="text-gray-600 mt-2 text-lg">{message}</p>
          <Button
            onClick={() => router.push('/login')}
            className="mt-8 w-full bg-green-600 hover:bg-green-700 h-12 text-lg font-semibold"
          >
            Go to Login
          </Button>
        </div>
      )}

      {status === 'error' && (
        <div className="animate-in shake duration-500">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-red-600">Verification Failed</h2>
          <p className="text-gray-600 mt-2 text-lg">{message}</p>
          <Button
            onClick={() => router.push('/login')}
            variant="outline"
            className="mt-8 w-full h-12 text-lg font-semibold border-red-200 hover:bg-red-50"
          >
            Back to Login
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </Card>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}