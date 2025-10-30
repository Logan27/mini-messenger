-- Fix messages table: add deletedAt column
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- Add index for deletedAt
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages("deletedAt") WHERE "deletedAt" IS NOT NULL;

-- Fix groups table: rename createdBy to creatorId and add missing columns
ALTER TABLE groups 
RENAME COLUMN "createdBy" TO "creatorId";

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS "maxMembers" INTEGER DEFAULT 200,
ADD COLUMN IF NOT EXISTS "groupType" VARCHAR(50) DEFAULT 'private' CHECK ("groupType" IN ('private', 'public', 'channel')),
ADD COLUMN IF NOT EXISTS "avatar" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "settings" JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "encryptionKey" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- Rename avatarUrl to match model
ALTER TABLE groups
DROP COLUMN IF EXISTS "avatarUrl";

-- Add indexes for groups
CREATE INDEX IF NOT EXISTS idx_groups_deleted_at ON groups("deletedAt") WHERE "deletedAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_groups_last_message_at ON groups("lastMessageAt");
CREATE INDEX IF NOT EXISTS idx_groups_type ON groups("groupType");

COMMENT ON COLUMN messages."deletedAt" IS 'Soft delete timestamp';
COMMENT ON COLUMN groups."creatorId" IS 'User ID who created the group';
COMMENT ON COLUMN groups."deletedAt" IS 'Soft delete timestamp';
COMMENT ON COLUMN groups."groupType" IS 'Group type: private, public, or channel';
