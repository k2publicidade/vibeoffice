-- Migration 029: Releases Module (Lançamentos)
-- Tabela para gerenciar lançamentos musicais com Kanban board

-- Criar tabela de releases
CREATE TABLE IF NOT EXISTS public.releases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  release_type TEXT NOT NULL DEFAULT 'single' CHECK (release_type IN ('single', 'ep', 'album')),
  genre TEXT,
  release_date DATE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'released')),
  cover_url TEXT,
  spotify_url TEXT,
  apple_music_url TEXT,
  youtube_url TEXT,
  isrc TEXT,
  upc TEXT,
  label TEXT,
  distributor TEXT,
  notes TEXT,
  sector TEXT CHECK (sector IN ('A&R', 'Marketing', 'Financeiro', 'Jurídico', 'Administrativo', 'TI/Suporte', 'Atendimento ao Artista')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  position INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_releases_status ON public.releases(status);
CREATE INDEX IF NOT EXISTS idx_releases_artist ON public.releases(artist);
CREATE INDEX IF NOT EXISTS idx_releases_release_date ON public.releases(release_date);
CREATE INDEX IF NOT EXISTS idx_releases_created_by ON public.releases(created_by);

-- Enable RLS
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

-- RLS Policies: authenticated users can do everything
CREATE POLICY "releases_select_all" ON public.releases
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "releases_insert_authenticated" ON public.releases
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "releases_update_authenticated" ON public.releases
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "releases_delete_authenticated" ON public.releases
  FOR DELETE TO authenticated USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.releases;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_releases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_releases_updated_at
  BEFORE UPDATE ON public.releases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_releases_updated_at();
