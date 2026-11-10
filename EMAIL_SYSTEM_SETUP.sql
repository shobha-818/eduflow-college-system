-- Email Notification & Verification Setup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ;

-- Update existing users to verified (optional, but good for existing system)
UPDATE profiles SET email_verified = TRUE WHERE email_verified IS NULL;
