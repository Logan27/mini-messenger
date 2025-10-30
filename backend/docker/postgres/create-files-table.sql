-- Create files table matching File model
CREATE TYPE file_type AS ENUM ('image', 'document', 'video', 'audio');
CREATE TYPE virus_scan_status AS ENUM ('pending', 'scanning', 'clean', 'infected', 'error');

CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "uploaderId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "messageId" UUID REFERENCES messages(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "filePath" VARCHAR(500) NOT NULL,
    "fileSize" INTEGER NOT NULL CHECK ("fileSize" >= 0),
    "mimeType" VARCHAR(100) NOT NULL,
    "fileType" file_type NOT NULL,
    "isImage" BOOLEAN NOT NULL DEFAULT false,
    width INTEGER CHECK (width >= 0),
    height INTEGER CHECK (height >= 0),
    "thumbnailPath" VARCHAR(500),
    "virusScanStatus" virus_scan_status NOT NULL DEFAULT 'pending',
    "virusScanResult" JSONB,
    "downloadCount" INTEGER NOT NULL DEFAULT 0 CHECK ("downloadCount" >= 0),
    "expiresAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_files_uploader_id ON files("uploaderId");
CREATE INDEX IF NOT EXISTS idx_files_message_id ON files("messageId");
CREATE INDEX IF NOT EXISTS idx_files_type ON files("fileType");
CREATE INDEX IF NOT EXISTS idx_files_virus_status ON files("virusScanStatus");
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files("createdAt");

-- Add trigger for updatedAt
CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION "updateUpdatedAt"();
