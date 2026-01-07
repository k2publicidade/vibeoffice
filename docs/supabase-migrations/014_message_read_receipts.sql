-- Migration: Add read_by column to messages table
-- Created: 2026-01-07
-- Description: Adds read_by JSONB to track who read each message and when

-- Add read_by column to messages table
ALTER TABLE public.messages
ADD COLUMN read_by JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add comment to explain structure
COMMENT ON COLUMN public.messages.read_by IS 'Tracks who read the message: {"userId": "2024-01-07T10:30:00Z"}';

-- Create index for read_by queries (check if user read message)
CREATE INDEX idx_messages_read_by ON public.messages USING GIN (read_by);

-- Example queries:

-- Mark message as read by a user:
-- UPDATE messages
-- SET read_by = jsonb_set(
--   read_by,
--   '{user-id}',
--   to_jsonb(NOW()::text)
-- )
-- WHERE id = 'message-id';

-- Check if user read a message:
-- SELECT read_by ? 'user-id' FROM messages WHERE id = 'message-id';

-- Get timestamp when user read message:
-- SELECT read_by->'user-id' FROM messages WHERE id = 'message-id';

-- Count how many users read a message:
-- SELECT jsonb_object_keys(read_by) FROM messages WHERE id = 'message-id';

-- Get all users who read a message:
-- SELECT jsonb_object_keys(read_by) as user_id FROM messages WHERE id = 'message-id';
