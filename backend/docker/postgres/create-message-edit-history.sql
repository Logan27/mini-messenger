-- Create messageEditHistory table for tracking message edits
CREATE TABLE IF NOT EXISTS "messageEditHistory" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "messageId" UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    "editedBy" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "previousContent" TEXT NOT NULL,
    "editedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_edit_history_message_id ON "messageEditHistory"("messageId");
CREATE INDEX IF NOT EXISTS idx_message_edit_history_edited_by ON "messageEditHistory"("editedBy");
CREATE INDEX IF NOT EXISTS idx_message_edit_history_edited_at ON "messageEditHistory"("editedAt");

-- Display result
SELECT 'messageEditHistory table created successfully' as status;
