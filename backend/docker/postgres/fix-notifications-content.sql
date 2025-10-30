-- Fix notifications table: rename message to content and add missing columns
ALTER TABLE notifications 
RENAME COLUMN message TO content;

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'message', 'group', 'call', 'system', 'admin'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications("userId", read) WHERE read = false;

COMMENT ON COLUMN notifications.content IS 'Notification message content';
COMMENT ON COLUMN notifications.priority IS 'Notification priority: low, normal, high, urgent';
COMMENT ON COLUMN notifications.category IS 'Notification category for filtering';
