-- ============================================================================
-- COMPREHENSIVE DATABASE FIX - ALL camelCase corrections and missing columns
-- ============================================================================

-- 1. Enable pg_trgm extension for user search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Fix messages table - add ALL missing columns
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS "encryptedContent" TEXT,
ADD COLUMN IF NOT EXISTS "encryptionMetadata" JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "isEncrypted" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "encryptionAlgorithm" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "deleteType" VARCHAR(10) CHECK ("deleteType" IN ('soft', 'hard')),
ADD COLUMN IF NOT EXISTS "replyToId" UUID REFERENCES messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP WITH TIME ZONE;

-- 3. Fix notifications table
ALTER TABLE notifications
RENAME COLUMN message TO content;

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'message', 'group', 'call', 'system', 'admin')),
ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP WITH TIME ZONE;

-- 4. Fix announcements table
ALTER TABLE announcements
RENAME COLUMN content TO message;

ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS link VARCHAR(500),
ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- 5. Fix notification_settings table
ALTER TABLE notification_settings
ADD COLUMN IF NOT EXISTS "inAppEnabled" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "emailEnabled" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "pushEnabled" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "quietHoursStart" TIME,
ADD COLUMN IF NOT EXISTS "quietHoursEnd" TIME,
ADD COLUMN IF NOT EXISTS "doNotDisturb" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "adminNotifications" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "systemNotifications" BOOLEAN DEFAULT true;

-- 6. Fix groups table
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

-- 7. Fix groupMembers table (rename from group_members if needed)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_members') THEN
        ALTER TABLE group_members RENAME TO "groupMembers";
    END IF;
END $$;

-- Add missing columns to groupMembers
ALTER TABLE "groupMembers"
ADD COLUMN IF NOT EXISTS "leftAt" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "invitedBy" UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS "permissions" JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_encrypted ON messages("isEncrypted");
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages("replyToId");
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages("expiresAt") WHERE "expiresAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages("readAt") WHERE "readAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications("expiresAt") WHERE "expiresAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON announcements("expiresAt") WHERE "expiresAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_deleted_at ON announcements("deletedAt") WHERE "deletedAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_groups_deleted_at ON groups("deletedAt") WHERE "deletedAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_groups_last_message_at ON groups("lastMessageAt");

CREATE INDEX IF NOT EXISTS idx_group_members_is_active ON "groupMembers"("isActive");
CREATE INDEX IF NOT EXISTS idx_group_members_deleted_at ON "groupMembers"("deletedAt") WHERE "deletedAt" IS NOT NULL;

-- 9. Create GIN indexes for full-text search
CREATE INDEX IF NOT EXISTS idx_users_search_gin ON users USING gin(
  to_tsvector('english',
    COALESCE(username, '') || ' ' ||
    COALESCE("firstName", '') || ' ' ||
    COALESCE("lastName", '') || ' ' ||
    COALESCE(email, '')
  )
);

CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING gin(username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_firstname_trgm ON users USING gin("firstName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_lastname_trgm ON users USING gin("lastName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON users USING gin(email gin_trgm_ops);

-- 10. Create/update triggers for updatedAt
CREATE OR REPLACE FUNCTION "updateUpdatedAt"()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_group_members_updated_at ON "groupMembers";
CREATE TRIGGER update_group_members_updated_at
BEFORE UPDATE ON "groupMembers"
FOR EACH ROW
EXECUTE FUNCTION "updateUpdatedAt"();

-- Done!
SELECT 'Database schema fixed successfully!' AS status;
