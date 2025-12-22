-- =====================================
-- Messenger Database Initialization
-- =====================================

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'system');
CREATE TYPE call_type AS ENUM ('video', 'audio');
CREATE TYPE call_status AS ENUM ('initiated', 'ringing', 'connected', 'ended', 'missed', 'cancelled');

-- Create users table (matching Sequelize User model with underscored: true)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar VARCHAR(500),
    bio TEXT,
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'offline',
    role user_role DEFAULT 'user',
    approval_status VARCHAR(20) DEFAULT 'approved',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255) UNIQUE,
    password_reset_token VARCHAR(255) UNIQUE,
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    public_key TEXT,
    read_receipts_enabled BOOLEAN DEFAULT true,
    terms_accepted_at TIMESTAMP WITH TIME ZONE,
    privacy_accepted_at TIMESTAMP WITH TIME ZONE,
    terms_version VARCHAR(20) DEFAULT '1.0',
    privacy_version VARCHAR(20) DEFAULT '1.0',
    two_factor_secret VARCHAR(255),
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_backup_codes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT proper_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create user_sessions table for refresh tokens
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) UNIQUE NOT NULL,
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID,
    content TEXT,
    message_type message_type DEFAULT 'text',
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    encryption_key VARCHAR(255),
    is_deleted BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT messages_recipient_or_group CHECK (
        (recipient_id IS NOT NULL AND group_id IS NULL) OR
        (recipient_id IS NULL AND group_id IS NOT NULL)
    )
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url VARCHAR(500),
    created_by UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role DEFAULT 'user',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unread_count INTEGER DEFAULT 0,
    deleted_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(group_id, user_id)
);

-- Create calls table
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caller_id UUID NOT NULL REFERENCES users(id),
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    call_type call_type NOT NULL,
    status call_status DEFAULT 'initiated',
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT calls_recipient_or_group CHECK (
        (recipient_id IS NOT NULL AND group_id IS NULL) OR
        (recipient_id IS NULL AND group_id IS NOT NULL)
    )
);

-- Create file_uploads table
CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    virus_scan_status VARCHAR(50) DEFAULT 'pending',
    virus_scan_result JSONB,
    is_quarantined BOOLEAN DEFAULT false,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_log table for security tracking
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_caller ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_recipient ON calls(recipient_id);
CREATE INDEX IF NOT EXISTS idx_calls_group ON calls(group_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_file_uploads_user ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_scan_status ON file_uploads(virus_scan_status);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_messages_sender_created ON messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_created ON messages(recipient_id, created_at DESC) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_cleanup ON messages(expires_at) WHERE expires_at IS NOT NULL AND is_deleted = false;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: 'admin_password' - CHANGE THIS!)
-- Password hash generated with bcryptjs (rounds: 12)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, email_verified)
VALUES (
    'admin',
    'admin@messenger.local',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeehPCtcxN.wd0xC3W',
    'System',
    'Administrator',
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;

-- Create some test users for development
INSERT INTO users (username, email, password_hash, first_name, last_name, email_verified)
VALUES
    ('test1', 'test1@messenger.local', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeehPCtcxN.wd0xC3W', 'Test', 'User1', true),
    ('test2', 'test2@messenger.local', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeehPCtcxN.wd0xC3W', 'Test', 'User2', true),
    ('test3', 'test3@messenger.local', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeehPCtcxN.wd0xC3W', 'Test', 'User3', true)
ON CONFLICT (email) DO NOTHING;

-- Create cleanup function for expired messages
CREATE OR REPLACE FUNCTION cleanup_expired_messages()
RETURNS void AS $$
BEGIN
    UPDATE messages
    SET is_deleted = true
    WHERE expires_at IS NOT NULL
    AND expires_at < CURRENT_TIMESTAMP
    AND is_deleted = false;
END;
$$ LANGUAGE plpgsql;-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(255) NOT NULL DEFAULT 'pending',
    blocked_at TIMESTAMP WITH TIME ZONE,
    nickname VARCHAR(100),
    notes TEXT,
    is_favorite BOOLEAN DEFAULT false,
    last_contact_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_user ON contacts(contact_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_favorite ON contacts(is_favorite);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_last_contact ON contacts(last_contact_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique_user_contact ON contacts(user_id, contact_user_id);


-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    in_app_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    do_not_disturb BOOLEAN DEFAULT false,
    message_notifications BOOLEAN DEFAULT true,
    call_notifications BOOLEAN DEFAULT true,
    mention_notifications BOOLEAN DEFAULT true,
    admin_notifications BOOLEAN DEFAULT true,
    system_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_user_id_unique ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_in_app_enabled ON notification_settings(in_app_enabled);
CREATE INDEX IF NOT EXISTS idx_notification_settings_email_enabled ON notification_settings(email_enabled);
CREATE INDEX IF NOT EXISTS idx_notification_settings_push_enabled ON notification_settings(push_enabled);
CREATE INDEX IF NOT EXISTS idx_notification_settings_dnd ON notification_settings(do_not_disturb);
CREATE INDEX IF NOT EXISTS idx_notification_settings_quiet_hours ON notification_settings(quiet_hours_start, quiet_hours_end);
CREATE INDEX IF NOT EXISTS idx_notification_settings_updated_at ON notification_settings(updated_at);

-- Create group_message_status table
DO $$ BEGIN
    CREATE TYPE group_message_status_enum AS ENUM ('sent', 'delivered', 'read');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS group_message_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status group_message_status_enum NOT NULL DEFAULT 'sent',
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_message_status_message ON group_message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_group_message_status_user ON group_message_status(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_message_status_unique ON group_message_status(message_id, user_id);
CREATE INDEX IF NOT EXISTS idx_group_message_status_status ON group_message_status(status);
CREATE INDEX IF NOT EXISTS idx_group_message_status_delivered ON group_message_status(delivered_at);
CREATE INDEX IF NOT EXISTS idx_group_message_status_read ON group_message_status(read_at);

