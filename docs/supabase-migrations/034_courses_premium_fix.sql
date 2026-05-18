-- ============================================
-- Migration 034: Courses Premium UX (fix idempotente)
-- Data: 2026-05-18
-- Problema: migration 033 nunca foi aplicada (erro 42710 ao rodar
--   supabase-migrations.sql por engano). Sem ela, app falha com
--   PGRST204 "Could not find the 'author_id' column of 'courses'".
-- Esta versão:
--   - Sem dependência de unaccent (backfill em JS-safe regex).
--   - 100% idempotente: pode rodar várias vezes sem erro.
-- ============================================

-- ---- courses: colunas faltando ----
ALTER TABLE public.courses ALTER COLUMN description DROP NOT NULL;
ALTER TABLE public.courses ALTER COLUMN instructor DROP NOT NULL;

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS courses_slug_unique
  ON public.courses (slug) WHERE slug IS NOT NULL;

-- Backfill de slug sem unaccent (translit manual de acentos PT-BR)
UPDATE public.courses
SET slug = lower(
  regexp_replace(
    regexp_replace(
      translate(title,
        'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ',
        'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn'),
      '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g')
) || '-' || substring(id::text, 1, 6)
WHERE slug IS NULL;

-- ---- trigger updated_at em courses ----
CREATE OR REPLACE FUNCTION public.set_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS courses_set_updated_at ON public.courses;
CREATE TRIGGER courses_set_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_courses_updated_at();

-- ---- lessons: colunas faltando (live DB nao tinha module_id/type/content_url/duration/description!) ----
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'video';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS content_url TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS materials JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS chapter TEXT;

-- CHECK constraint em type (idempotente: drop/recria)
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_type_check;
ALTER TABLE public.lessons ADD CONSTRAINT lessons_type_check
  CHECK (type IN ('video', 'html', 'quiz'));

-- Permitir content NULL (lessons antigas podem ter sido criadas com NOT NULL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lessons'
      AND column_name = 'content' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.lessons ALTER COLUMN content DROP NOT NULL;
  END IF;
END $$;

-- ---- RLS courses/modules/lessons: leitura aberta, escrita Admin only ----
DROP POLICY IF EXISTS "Authenticated users can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can manage modules" ON public.modules;
DROP POLICY IF EXISTS "Authenticated users can manage lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
DROP POLICY IF EXISTS "Authenticated can read courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated can read modules" ON public.modules;
DROP POLICY IF EXISTS "Authenticated can read lessons" ON public.lessons;
DROP POLICY IF EXISTS "Public read courses" ON public.courses;
DROP POLICY IF EXISTS "Public read modules" ON public.modules;
DROP POLICY IF EXISTS "Public read lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can insert/update/delete courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can insert/update/delete modules" ON public.modules;
DROP POLICY IF EXISTS "Admins can insert/update/delete lessons" ON public.lessons;

CREATE POLICY "Authenticated can read courses"
  ON public.courses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can read modules"
  ON public.modules FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can read lessons"
  ON public.lessons FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage courses"
  ON public.courses FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin');

CREATE POLICY "Admins can manage modules"
  ON public.modules FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin');

CREATE POLICY "Admins can manage lessons"
  ON public.lessons FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin');

-- ---- tasks: restrição Admin (parte da 033) ----
DROP POLICY IF EXISTS "Authenticated users can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;

CREATE POLICY "Admins can manage tasks"
  ON public.tasks FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin');

-- ---- Verificação ----
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'courses'
  AND column_name IN ('slug','subtitle','is_published','updated_at','author_id','description','instructor')
ORDER BY column_name;
