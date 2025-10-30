-- Fix messages table: add missing status column
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed'));

-- Create index for message status
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Fix group_members table: add all missing columns
ALTER TABLE group_members 
ADD COLUMN IF NOT EXISTS leftAt TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS isActive BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invitedBy UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS lastSeenAt TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP WITH TIME ZONE;

-- Create trigger for group_members updatedAt
CREATE OR REPLACE TRIGGER update_group_members_updated_at
  BEFORE UPDATE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION updateUpdatedAt();

-- Create additional indexes for group_members
CREATE INDEX IF NOT EXISTS idx_group_members_is_active ON group_members(isActive);
CREATE INDEX IF NOT EXISTS idx_group_members_deleted_at ON group_members(deletedAt) WHERE deletedAt IS NOT NULL;

-- Rename table from group_members to groupMembers for consistency
ALTER TABLE group_members RENAME TO "groupMembers";

-- Update status for all existing messages
UPDATE messages SET status = 'sent' WHERE status IS NULL;

COMMENT ON COLUMN messages.status IS 'Message delivery status: sent, delivered, read, failed';
COMMENT ON COLUMN "groupMembers".isActive IS 'Whether the member is currently active in the group';
COMMENT ON COLUMN "groupMembers".permissions IS 'Custom permissions for this group member';
