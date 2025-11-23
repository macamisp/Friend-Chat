-- Friend Chat Version 2.0 - Database Schema Updates

-- Add new columns to users table for profile features
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS profile_picture TEXT,
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"show_status": true, "show_profile_pic": true, "show_last_seen": true}'::jsonb;

-- Create full-text search indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_users_username_search 
  ON users USING gin(to_tsvector('english', username));
  
CREATE INDEX IF NOT EXISTS idx_users_email_search 
  ON users USING gin(to_tsvector('english', email));

-- Create index on last_seen for online status queries
CREATE INDEX IF NOT EXISTS idx_users_last_seen 
  ON users(last_seen DESC);

-- Function to update last_seen timestamp
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last_seen on user updates
DROP TRIGGER IF EXISTS trigger_update_last_seen ON users;
CREATE TRIGGER trigger_update_last_seen
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();

-- Add comments for documentation
COMMENT ON COLUMN users.bio IS 'User biography/about section (max 150 characters)';
COMMENT ON COLUMN users.profile_picture IS 'URL to user profile picture';
COMMENT ON COLUMN users.last_seen IS 'Timestamp of last user activity';
COMMENT ON COLUMN users.privacy_settings IS 'JSON object containing user privacy preferences';
