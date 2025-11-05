-- Add read receipts privacy setting to users table

-- Add readReceiptsEnabled column (default true for backward compatibility)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS "readReceiptsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS "idx_users_read_receipts_enabled" ON users ("readReceiptsEnabled");

-- Add comment
COMMENT ON COLUMN users."readReceiptsEnabled" IS 'Whether to send read receipts to other users (privacy setting)';

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Added readReceiptsEnabled column to users table';
END $$;
