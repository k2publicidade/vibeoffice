-- ============================================
-- Migration 035: Lessons - colunas faltantes no live DB
-- Data: 2026-05-18
-- Problema: a tabela `lessons` em produção foi criada SEM as colunas
--   originalmente definidas em 023_courses_module.sql. Diagnóstico via
--   service role mostrou que faltam: module_id, type, content_url,
--   duration, description. Resultado: app retorna 400 PGRST204 ao tentar
--   criar uma aula (ex: "Could not find the 'content_url' column").
-- Esta migration adiciona apenas o que falta — totalmente idempotente.
-- ============================================

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS module_id   UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS type        TEXT DEFAULT 'video',
  ADD COLUMN IF NOT EXISTS content_url TEXT,
  ADD COLUMN IF NOT EXISTS duration    INTEGER,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- CHECK constraint em type (drop+recria, idempotente)
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_type_check;
ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_type_check CHECK (type IN ('video', 'html', 'quiz'));

-- Verificação
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'lessons'
ORDER BY ordinal_position;
