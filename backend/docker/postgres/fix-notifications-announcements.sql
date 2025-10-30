-- Fix notifications table: add expiresAt column (model expects it)
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP WITH TIME ZONE;

-- Add index for expiresAt
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications("expiresAt") WHERE "expiresAt" IS NOT NULL;

-- Fix announcements table: rename content to message, add missing columns
ALTER TABLE announcements 
RENAME COLUMN content TO message;

ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS link VARCHAR(500),
ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- Add indexes for announcements
CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON announcements("expiresAt") WHERE "expiresAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_deleted_at ON announcements("deletedAt") WHERE "deletedAt" IS NOT NULL;

-- Fix notification_settings: add all missing columns required by model
ALTER TABLE notification_settings
ADD COLUMN IF NOT EXISTS "inAppEnabled" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "emailEnabled" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "pushEnabled" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "quietHoursStart" TIME,
ADD COLUMN IF NOT EXISTS "quietHoursEnd" TIME,
ADD COLUMN IF NOT EXISTS "doNotDisturb" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "adminNotifications" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "systemNotifications" BOOLEAN DEFAULT true;

-- Rename columns to match model expectations (camelCase consistency)
-- emailNotifications → already exists, keep as is
-- pushNotifications → already exists, keep as is
-- messageNotifications → already exists, keep as is
-- callNotifications → already exists, keep as is
-- mentionNotifications → already exists, keep as is

-- Add missing columns
CREATE INDEX IF NOT EXISTS idx_notification_settings_dnd ON notification_settings("doNotDisturb") WHERE "doNotDisturb" = true;

COMMENT ON COLUMN notifications."expiresAt" IS 'When this notification should expire and be auto-deleted';
COMMENT ON COLUMN announcements.message IS 'Announcement content/message';
COMMENT ON COLUMN announcements.link IS 'Optional link URL for the announcement';
COMMENT ON COLUMN announcements."expiresAt" IS 'When this announcement should expire';
COMMENT ON COLUMN notification_settings."inAppEnabled" IS 'Enable in-app notifications';
COMMENT ON COLUMN notification_settings."quietHoursStart" IS 'Start time for quiet hours (no notifications)';
COMMENT ON COLUMN notification_settings."quietHoursEnd" IS 'End time for quiet hours';
COMMENT ON COLUMN notification_settings."doNotDisturb" IS 'Do not disturb mode enabled';
