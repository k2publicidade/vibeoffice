-- Migration: Add artists, tracks, and wav_url columns to releases table
-- These columns were referenced in the application code but missing from the database

ALTER TABLE public.releases
  ADD COLUMN IF NOT EXISTS artists jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tracks jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS wav_url text;
