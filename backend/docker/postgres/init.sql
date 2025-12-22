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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role DEFAULT 'user',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unread_count INTEGER DEFAULT 0,

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
$$ LANGUAGE plpgsql;- -   C r e a t e   c o n t a c t s   t a b l e  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   c o n t a c t s   (  
         i d   U U I D   P R I M A R Y   K E Y   D E F A U L T   u u i d _ g e n e r a t e _ v 4 ( ) ,  
         u s e r _ i d   U U I D   N O T   N U L L   R E F E R E N C E S   u s e r s ( i d )   O N   D E L E T E   C A S C A D E ,  
         c o n t a c t _ u s e r _ i d   U U I D   N O T   N U L L   R E F E R E N C E S   u s e r s ( i d )   O N   D E L E T E   C A S C A D E ,  
         s t a t u s   V A R C H A R ( 2 5 5 )   N O T   N U L L   D E F A U L T   ' p e n d i n g ' ,  
         b l o c k e d _ a t   T I M E S T A M P   W I T H   T I M E   Z O N E ,  
         n i c k n a m e   V A R C H A R ( 1 0 0 ) ,  
         n o t e s   T E X T ,  
         i s _ f a v o r i t e   B O O L E A N   D E F A U L T   f a l s e ,  
         l a s t _ c o n t a c t _ a t   T I M E S T A M P   W I T H   T I M E   Z O N E ,  
         c r e a t e d _ a t   T I M E S T A M P   W I T H   T I M E   Z O N E   D E F A U L T   C U R R E N T _ T I M E S T A M P ,  
         u p d a t e d _ a t   T I M E S T A M P   W I T H   T I M E   Z O N E   D E F A U L T   C U R R E N T _ T I M E S T A M P  
 ) ;  
  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c o n t a c t s _ u s e r   O N   c o n t a c t s ( u s e r _ i d ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c o n t a c t s _ c o n t a c t _ u s e r   O N   c o n t a c t s ( c o n t a c t _ u s e r _ i d ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c o n t a c t s _ s t a t u s   O N   c o n t a c t s ( s t a t u s ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c o n t a c t s _ f a v o r i t e   O N   c o n t a c t s ( i s _ f a v o r i t e ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c o n t a c t s _ c r e a t e d _ a t   O N   c o n t a c t s ( c r e a t e d _ a t ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c o n t a c t s _ l a s t _ c o n t a c t   O N   c o n t a c t s ( l a s t _ c o n t a c t _ a t ) ;  
 C R E A T E   U N I Q U E   I N D E X   I F   N O T   E X I S T S   i d x _ c o n t a c t s _ u n i q u e _ u s e r _ c o n t a c t   O N   c o n t a c t s ( u s e r _ i d ,   c o n t a c t _ u s e r _ i d ) ;  
  
  
 - -   C r e a t e   n o t i f i c a t i o n _ s e t t i n g s   t a b l e  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   n o t i f i c a t i o n _ s e t t i n g s   (  
         i d   U U I D   P R I M A R Y   K E Y   D E F A U L T   u u i d _ g e n e r a t e _ v 4 ( ) ,  
         u s e r _ i d   U U I D   N O T   N U L L   R E F E R E N C E S   u s e r s ( i d )   O N   D E L E T E   C A S C A D E ,  
         i n _ a p p _ e n a b l e d   B O O L E A N   D E F A U L T   t r u e ,  
         e m a i l _ e n a b l e d   B O O L E A N   D E F A U L T   t r u e ,  
         p u s h _ e n a b l e d   B O O L E A N   D E F A U L T   t r u e ,  
         q u i e t _ h o u r s _ s t a r t   T I M E ,  
         q u i e t _ h o u r s _ e n d   T I M E ,  
         d o _ n o t _ d i s t u r b   B O O L E A N   D E F A U L T   f a l s e ,  
         m e s s a g e _ n o t i f i c a t i o n s   B O O L E A N   D E F A U L T   t r u e ,  
         c a l l _ n o t i f i c a t i o n s   B O O L E A N   D E F A U L T   t r u e ,  
         m e n t i o n _ n o t i f i c a t i o n s   B O O L E A N   D E F A U L T   t r u e ,  
         a d m i n _ n o t i f i c a t i o n s   B O O L E A N   D E F A U L T   t r u e ,  
         s y s t e m _ n o t i f i c a t i o n s   B O O L E A N   D E F A U L T   t r u e ,  
         c r e a t e d _ a t   T I M E S T A M P   W I T H   T I M E   Z O N E   D E F A U L T   C U R R E N T _ T I M E S T A M P ,  
         u p d a t e d _ a t   T I M E S T A M P   W I T H   T I M E   Z O N E   D E F A U L T   C U R R E N T _ T I M E S T A M P  
 ) ;  
  
 C R E A T E   U N I Q U E   I N D E X   I F   N O T   E X I S T S   i d x _ n o t i f i c a t i o n _ s e t t i n g s _ u s e r _ i d _ u n i q u e   O N   n o t i f i c a t i o n _ s e t t i n g s ( u s e r _ i d ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ n o t i f i c a t i o n _ s e t t i n g s _ i n _ a p p _ e n a b l e d   O N   n o t i f i c a t i o n _ s e t t i n g s ( i n _ a p p _ e n a b l e d ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ n o t i f i c a t i o n _ s e t t i n g s _ e m a i l _ e n a b l e d   O N   n o t i f i c a t i o n _ s e t t i n g s ( e m a i l _ e n a b l e d ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ n o t i f i c a t i o n _ s e t t i n g s _ p u s h _ e n a b l e d   O N   n o t i f i c a t i o n _ s e t t i n g s ( p u s h _ e n a b l e d ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ n o t i f i c a t i o n _ s e t t i n g s _ d n d   O N   n o t i f i c a t i o n _ s e t t i n g s ( d o _ n o t _ d i s t u r b ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ n o t i f i c a t i o n _ s e t t i n g s _ q u i e t _ h o u r s   O N   n o t i f i c a t i o n _ s e t t i n g s ( q u i e t _ h o u r s _ s t a r t ,   q u i e t _ h o u r s _ e n d ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ n o t i f i c a t i o n _ s e t t i n g s _ u p d a t e d _ a t   O N   n o t i f i c a t i o n _ s e t t i n g s ( u p d a t e d _ a t ) ;  
  
 - -   C r e a t e   g r o u p _ m e s s a g e _ s t a t u s   t a b l e  
 D O   $ $   B E G I N  
         C R E A T E   T Y P E   g r o u p _ m e s s a g e _ s t a t u s _ e n u m   A S   E N U M   ( ' s e n t ' ,   ' d e l i v e r e d ' ,   ' r e a d ' ) ;  
 E X C E P T I O N  
         W H E N   d u p l i c a t e _ o b j e c t   T H E N   n u l l ;  
 E N D   $ $ ;  
  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   g r o u p _ m e s s a g e _ s t a t u s   (  
         i d   U U I D   P R I M A R Y   K E Y   D E F A U L T   u u i d _ g e n e r a t e _ v 4 ( ) ,  
         m e s s a g e _ i d   U U I D   N O T   N U L L   R E F E R E N C E S   m e s s a g e s ( i d )   O N   D E L E T E   C A S C A D E ,  
         u s e r _ i d   U U I D   N O T   N U L L   R E F E R E N C E S   u s e r s ( i d )   O N   D E L E T E   C A S C A D E ,  
         s t a t u s   g r o u p _ m e s s a g e _ s t a t u s _ e n u m   N O T   N U L L   D E F A U L T   ' s e n t ' ,  
         d e l i v e r e d _ a t   T I M E S T A M P   W I T H   T I M E   Z O N E ,  
         r e a d _ a t   T I M E S T A M P   W I T H   T I M E   Z O N E ,  
         c r e a t e d _ a t   T I M E S T A M P   W I T H   T I M E   Z O N E   D E F A U L T   C U R R E N T _ T I M E S T A M P ,  
         u p d a t e d _ a t   T I M E S T A M P   W I T H   T I M E   Z O N E   D E F A U L T   C U R R E N T _ T I M E S T A M P  
 ) ;  
  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ g r o u p _ m e s s a g e _ s t a t u s _ m e s s a g e   O N   g r o u p _ m e s s a g e _ s t a t u s ( m e s s a g e _ i d ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ g r o u p _ m e s s a g e _ s t a t u s _ u s e r   O N   g r o u p _ m e s s a g e _ s t a t u s ( u s e r _ i d ) ;  
 C R E A T E   U N I Q U E   I N D E X   I F   N O T   E X I S T S   i d x _ g r o u p _ m e s s a g e _ s t a t u s _ u n i q u e   O N   g r o u p _ m e s s a g e _ s t a t u s ( m e s s a g e _ i d ,   u s e r _ i d ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ g r o u p _ m e s s a g e _ s t a t u s _ s t a t u s   O N   g r o u p _ m e s s a g e _ s t a t u s ( s t a t u s ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ g r o u p _ m e s s a g e _ s t a t u s _ d e l i v e r e d   O N   g r o u p _ m e s s a g e _ s t a t u s ( d e l i v e r e d _ a t ) ;  
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ g r o u p _ m e s s a g e _ s t a t u s _ r e a d   O N   g r o u p _ m e s s a g e _ s t a t u s ( r e a d _ a t ) ;  
  
 