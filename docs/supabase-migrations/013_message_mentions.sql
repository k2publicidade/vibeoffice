-- Migration: Add mentioned_users column to messages table
-- Created: 2026-01-07
-- Description: Adds mentioned_users array to track @mentions in messages

-- Add mentioned_users column to messages table
ALTER TABLE public.messages
ADD COLUMN mentioned_users TEXT[] NOT NULL DEFAULT '{}';

-- Add comment to explain structure
COMMENT ON COLUMN public.messages.mentioned_users IS 'Array of user IDs that were mentioned (@username) in this message';

-- Create index for mention queries (find messages where user was mentioned)
CREATE INDEX idx_messages_mentioned_users ON public.messages USING GIN (mentioned_users);

-- Example queries:

-- Find all messages where a specific user was mentioned:
-- SELECT * FROM messages WHERE 'user-id' = ANY(mentioned_users);

-- Find all users mentioned in a message:
-- SELECT mentioned_users FROM messages WHERE id = 'message-id';

-- Count how many times a user was mentioned:
-- SELECT COUNT(*) FROM messages WHERE 'user-id' = ANY(mentioned_users);
