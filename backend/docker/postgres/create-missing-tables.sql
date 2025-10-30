-- =====================================
-- Create all missing tables with camelCase columns
-- =====================================

-- CONTACTS TABLE
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "contactId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE("userId", "contactId")
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts("userId");
CREATE INDEX IF NOT EXISTS idx_contacts_contact_id ON contacts("contactId");
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT false,
    "readAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications("userId", read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications("createdAt");
CREATE INDEX IF NOT EXISTS idx_notifications_deleted ON notifications("deletedAt") WHERE "deletedAt" IS NOT NULL;

-- NOTIFICATION_SETTINGS TABLE
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    "emailNotifications" BOOLEAN DEFAULT true,
    "pushNotifications" BOOLEAN DEFAULT true,
    "messageNotifications" BOOLEAN DEFAULT true,
    "groupNotifications" BOOLEAN DEFAULT true,
    "callNotifications" BOOLEAN DEFAULT true,
    "mentionNotifications" BOOLEAN DEFAULT true,
    "muteAll" BOOLEAN DEFAULT false,
    "mutedUntil" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings("userId");

-- ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    "createdBy" UUID NOT NULL REFERENCES users(id),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements("isActive");
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements("createdAt");

-- DEVICES TABLE
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "deviceToken" VARCHAR(500) NOT NULL UNIQUE,
    "deviceType" VARCHAR(50) NOT NULL,
    "deviceName" VARCHAR(255),
    "lastActive" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices("userId");
CREATE INDEX IF NOT EXISTS idx_devices_token ON devices("deviceToken");

-- REPORTS TABLE
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "reporterId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "reportedUserId" UUID REFERENCES users(id) ON DELETE CASCADE,
    "reportedMessageId" UUID REFERENCES messages(id) ON DELETE CASCADE,
    "reportedGroupId" UUID REFERENCES groups(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    "reviewedBy" UUID REFERENCES users(id),
    "reviewedAt" TIMESTAMP WITH TIME ZONE,
    resolution TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports("reporterId");
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports("createdAt");

-- PASSWORD_HISTORY TABLE
CREATE TABLE IF NOT EXISTS password_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "passwordHash" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history("userId");
CREATE INDEX IF NOT EXISTS idx_password_history_created ON password_history("createdAt");

-- SYSTEM_SETTINGS TABLE
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- GROUP_MESSAGE_STATUS TABLE (для отслеживания прочитанных сообщений в группах)
CREATE TABLE IF NOT EXISTS group_message_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "messageId" UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "readAt" TIMESTAMP WITH TIME ZONE,
    "deliveredAt" TIMESTAMP WITH TIME ZONE,
    
    UNIQUE("messageId", "userId")
);

CREATE INDEX IF NOT EXISTS idx_group_msg_status_message ON group_message_status("messageId");
CREATE INDEX IF NOT EXISTS idx_group_msg_status_user ON group_message_status("userId");

-- Add triggers for updatedAt
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION "updateUpdatedAt"();

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION "updateUpdatedAt"();

CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION "updateUpdatedAt"();

CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION "updateUpdatedAt"();

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION "updateUpdatedAt"();

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION "updateUpdatedAt"();

COMMIT;
