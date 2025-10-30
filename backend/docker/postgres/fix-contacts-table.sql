-- Fix contacts table to match Contact model
ALTER TABLE contacts RENAME COLUMN "contactId" TO "contactUserId";
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "blockedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "isFavorite" BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "lastContactAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- Update indexes
DROP INDEX IF EXISTS idx_contacts_contact_id;
CREATE INDEX IF NOT EXISTS idx_contacts_contact_user_id ON contacts("contactUserId");
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts("deletedAt") WHERE "deletedAt" IS NOT NULL;

-- Add trigger
CREATE TRIGGER update_contacts_updated_at_trigger
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION "updateUpdatedAt"();
