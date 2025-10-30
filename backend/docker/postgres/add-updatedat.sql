-- Add updatedAt column to messages if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Verify it was created
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('createdAt', 'updatedAt', 'metadata', 'replyToId', 'deleteType')
ORDER BY column_name;
