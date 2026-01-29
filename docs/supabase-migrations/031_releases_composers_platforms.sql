-- Migration: Add composers and platform_links JSONB columns to releases
-- Date: 2026-01-29

ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS composers JSONB DEFAULT '[]';
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS platform_links JSONB DEFAULT '[]';

-- Note: spotify_url, apple_music_url, youtube_url columns are kept for backward compatibility
-- but are no longer used by the frontend (replaced by platform_links JSONB)
