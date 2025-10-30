-- Fix messages table: add missing encryption columns
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS "encryptedContent" TEXT,
ADD COLUMN IF NOT EXISTS "encryptionMetadata" JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "isEncrypted" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "encryptionAlgorithm" VARCHAR(50);

-- Add indexes for encryption
CREATE INDEX IF NOT EXISTS idx_messages_is_encrypted ON messages("isEncrypted");
CREATE INDEX IF NOT EXISTS idx_messages_encrypted_created ON messages("isEncrypted", "createdAt" DESC) WHERE "isEncrypted" = true;

-- Add missing message columns (fileUrl was mentioned in model but not in table)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS "fileUrl" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP WITH TIME ZONE;

-- Add index for read status tracking
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages("readAt") WHERE "readAt" IS NOT NULL;

COMMENT ON COLUMN messages."encryptedContent" IS 'Encrypted message content for E2E encryption';
COMMENT ON COLUMN messages."encryptionMetadata" IS 'Encryption metadata: algorithm, nonce, authTag';
COMMENT ON COLUMN messages."isEncrypted" IS 'Whether this message is end-to-end encrypted';
COMMENT ON COLUMN messages."encryptionAlgorithm" IS 'Encryption algorithm used (e.g., x25519-xsalsa20-poly1305)';
COMMENT ON COLUMN messages."fileUrl" IS 'URL/path to attached file';
COMMENT ON COLUMN messages."readAt" IS 'When recipient read this message';
