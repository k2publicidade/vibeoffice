-- Migration 015: User Chat Preferences
-- Allows users to archive chat rooms for a cleaner interface
-- Created: 2026-01-07

-- Create user_chat_preferences table
CREATE TABLE IF NOT EXISTS public.user_chat_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one preference row per user-room pair
  UNIQUE(user_id, room_id)
);

-- Add indexes for common queries
CREATE INDEX idx_user_chat_prefs_user_id ON public.user_chat_preferences(user_id);
CREATE INDEX idx_user_chat_prefs_room_id ON public.user_chat_preferences(room_id);
CREATE INDEX idx_user_chat_prefs_archived ON public.user_chat_preferences(user_id, is_archived);

-- Add comments
COMMENT ON TABLE public.user_chat_preferences IS 'Stores user-specific preferences for chat rooms (archive status, etc)';
COMMENT ON COLUMN public.user_chat_preferences.is_archived IS 'Whether the user has archived this chat room';
COMMENT ON COLUMN public.user_chat_preferences.archived_at IS 'When the room was archived (null if not archived)';

-- Enable RLS
ALTER TABLE public.user_chat_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and modify their own preferences
CREATE POLICY "Users can view their own chat preferences"
  ON public.user_chat_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat preferences"
  ON public.user_chat_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat preferences"
  ON public.user_chat_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat preferences"
  ON public.user_chat_preferences
  FOR DELETE
  USING (auth.uid() = user_id);
