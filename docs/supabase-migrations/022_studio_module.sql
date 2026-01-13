-- ============================================
-- Migration 022: Módulo de Estúdio (Studio Sessions)
-- Data: 2026-01-13
-- Descrição: Tabela para gerenciar agendamentos de estúdio (baseado no vibe-distro-studio)
-- ============================================

CREATE TABLE IF NOT EXISTS public.studio_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_title TEXT NOT NULL,
  studio_name TEXT NOT NULL DEFAULT 'Studio A', -- Studio A, Studio B, etc.
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  workstation_id TEXT, -- Qual PC/Mac foi usado
  session_types TEXT[] DEFAULT '{}', -- Gravacao, Mix, Master, etc.
  
  -- Armazenando participantes como JSONB arrays de {name, role, email, phone}
  producers JSONB DEFAULT '[]'::jsonb,
  artists JSONB DEFAULT '[]'::jsonb,
  composers JSONB DEFAULT '[]'::jsonb,
  
  notes TEXT,
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_studio_bookings_date ON public.studio_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_studio_bookings_created_by ON public.studio_bookings(created_by);

-- RLS
ALTER TABLE public.studio_bookings ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Leitura: Todos autenticados podem ver a agenda (para evitar conflitos)
CREATE POLICY "Users can view all bookings"
  ON public.studio_bookings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 2. Inserção: Autenticados podem agendar
CREATE POLICY "Users can create bookings"
  ON public.studio_bookings
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 3. Atualização: Apenas o criador ou Admin (aqui deixaremos criador por enquanto, idealmente teria role admin)
CREATE POLICY "Users can update own bookings"
  ON public.studio_bookings
  FOR UPDATE
  USING (auth.uid() = created_by);

-- 4. Deleção: Apenas o criador
CREATE POLICY "Users can delete own bookings"
  ON public.studio_bookings
  FOR DELETE
  USING (auth.uid() = created_by);

-- Trigger para updated_at
CREATE OR REPLACE TRIGGER update_studio_bookings_modtime
  BEFORE UPDATE ON public.studio_bookings
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
