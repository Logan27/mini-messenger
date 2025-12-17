-- Migration to add missing columns to match Sequelize models

-- ===========================
-- MESSAGES TABLE UPDATES
-- ===========================

-- Add missing columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS encrypted_content TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS encryption_metadata JSONB DEFAULT '{}';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS encryption_algorithm VARCHAR(50);

-- Add status enum type and column
DO $$ BEGIN
    CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS status message_status DEFAULT 'sent';

-- Add delete_type enum and column
DO $$ BEGIN
    CREATE TYPE message_delete_type AS ENUM ('soft', 'hard');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS delete_type message_delete_type;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add reply and metadata columns
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}';

-- Add updated_at column
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Remove file_url column (file info now comes from file_uploads table)
-- We'll keep it for backward compatibility, but new code won't use it

-- Update existing rows
UPDATE messages SET
    is_encrypted = false,
    encryption_metadata = '{}',
    status = 'sent',
    metadata = '{}',
    reactions = '{}',
    updated_at = created_at
WHERE is_encrypted IS NULL;

-- ===========================
-- FILE_UPLOADS TABLE UPDATES
-- ===========================

-- Add missing columns to file_uploads table
ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES messages(id);

-- Add file_type enum
DO $$ BEGIN
    CREATE TYPE file_type_enum AS ENUM ('image', 'document', 'video', 'audio');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS file_type file_type_enum;
ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS is_image BOOLEAN DEFAULT false;
ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS thumbnail_path VARCHAR(500);
ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;
ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Rename user_id to uploader_id for consistency
ALTER TABLE file_uploads RENAME COLUMN user_id TO uploader_id;

-- Rename file_name to filename and original_name to original_name (already correct)
ALTER TABLE file_uploads RENAME COLUMN file_name TO filename;

-- Update existing rows - set file_type based on mime_type
UPDATE file_uploads
SET file_type = CASE
    WHEN mime_type LIKE 'image/%' THEN 'image'::file_type_enum
    WHEN mime_type LIKE 'video/%' THEN 'video'::file_type_enum
    WHEN mime_type LIKE 'audio/%' THEN 'audio'::file_type_enum
    ELSE 'document'::file_type_enum
END,
is_image = (mime_type LIKE 'image/%'),
created_at = uploaded_at,
updated_at = uploaded_at
WHERE file_type IS NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_is_encrypted ON messages(is_encrypted);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_file_uploads_message_id ON file_uploads(message_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_file_type ON file_uploads(file_type);
CREATE INDEX IF NOT EXISTS idx_file_uploads_expires_at ON file_uploads(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON COLUMN messages.encrypted_content IS 'E2E encrypted message content';
COMMENT ON COLUMN messages.is_encrypted IS 'Whether this message is end-to-end encrypted';
COMMENT ON COLUMN messages.status IS 'Message delivery status';
COMMENT ON COLUMN messages.delete_type IS 'soft = deleted for sender only, hard = deleted for everyone';
COMMENT ON COLUMN messages.reactions IS 'Message reactions: { "👍": ["userId1"], "❤️": ["userId2"] }';

COMMENT ON COLUMN file_uploads.message_id IS 'Message this file belongs to';
COMMENT ON COLUMN file_uploads.file_type IS 'Type of file for categorization';
