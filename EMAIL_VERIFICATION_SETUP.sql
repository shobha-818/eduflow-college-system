-- Add fields required for email verification and verification tracking
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS verification_token TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ;
