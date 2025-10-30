-- Add missing columns to messageEditHistory table
ALTER TABLE "messageEditHistory" ADD COLUMN IF NOT EXISTS "newContent" TEXT NOT NULL DEFAULT '';
ALTER TABLE "messageEditHistory" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name='messageEditHistory' 
ORDER BY ordinal_position;
