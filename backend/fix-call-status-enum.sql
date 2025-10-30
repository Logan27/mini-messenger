-- Fix call_status enum to match the model definition
-- The model expects: 'calling', 'connected', 'ended', 'rejected', 'missed'
-- The database has: 'initiated', 'ringing', 'connected', 'ended', 'missed', 'cancelled'

-- Add missing values that the model uses
ALTER TYPE call_status ADD VALUE IF NOT EXISTS 'calling';
ALTER TYPE call_status ADD VALUE IF NOT EXISTS 'rejected';

-- Note: We keep 'initiated', 'ringing', and 'cancelled' in the enum as they don't hurt
-- But the application code should use 'calling' instead of 'ringing'
