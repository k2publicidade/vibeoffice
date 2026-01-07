-- Migration: Add reactions column to messages table
-- Created: 2026-01-07
-- Description: Adds JSONB column to store emoji reactions on messages

-- Add reactions column to messages table
ALTER TABLE public.messages
ADD COLUMN reactions JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add comment to explain structure
COMMENT ON COLUMN public.messages.reactions IS 'Stores emoji reactions in format: {"emoji": ["userId1", "userId2"]}';

-- Create index for reactions queries (optional, for performance)
CREATE INDEX idx_messages_reactions ON public.messages USING GIN (reactions);

-- Example usage:
-- Insert reaction:
-- UPDATE messages
-- SET reactions = jsonb_set(
--   reactions,
--   '{👍}',
--   COALESCE(reactions->'👍', '[]'::jsonb) || '["user-id"]'::jsonb
-- )
-- WHERE id = 'message-id';

-- Remove reaction:
-- UPDATE messages
-- SET reactions = jsonb_set(
--   reactions,
--   '{👍}',
--   (SELECT jsonb_agg(elem) FROM jsonb_array_elements_text(reactions->'👍') elem WHERE elem != 'user-id')
-- )
-- WHERE id = 'message-id';
