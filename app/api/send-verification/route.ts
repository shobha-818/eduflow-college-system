import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendVerificationEmail } from '@/lib/emailService';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and Name are required' }, { status: 400 });
    }

    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');

    // Update profile with token
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({
        verification_token: token,
        verification_sent_at: new Date().toISOString(),
        email_verified: false
      })
      .eq('email', email)
      .select('*');

    if (updateError) throw updateError;
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Send the email
    await sendVerificationEmail(email, name, token);

    return NextResponse.json({ success: true, message: 'Verification email sent' });
  } catch (error: any) {
    console.error('Send verification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
