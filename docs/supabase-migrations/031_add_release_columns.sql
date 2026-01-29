-- Migration to add support for multiple artists, tracks, and wav audio files
ALTER TABLE releases 
ADD COLUMN IF NOT EXISTS artists JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tracks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS wav_url TEXT;

-- Comment on columns for clarity
COMMENT ON COLUMN releases.artists IS 'Array of artist objects {name, role}';
COMMENT ON COLUMN releases.tracks IS 'Array of track objects for EP/Album';
COMMENT ON COLUMN releases.wav_url IS 'URL to the high-quality WAV audio file';
