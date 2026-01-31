-- Add profile update columns to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS profile_picture TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS update_token TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP;
