-- ============================================
-- Migration 033: Courses Premium UX
-- Data: 2026-05-12
-- Descrição:
--   1. Corrige bug "não consigo criar curso" (description/instructor NOT NULL).
--   2. Adiciona colunas para nova UX (slug, subtítulo, publicado).
--   3. Adiciona materiais de apoio nas aulas (JSONB).
--   4. Garante updated_at em courses + trigger.
--   5. Restringe gestão de cursos a Admin.
--   6. Restringe gestão de tasks a Admin (módulo todo).
-- ============================================

-- ============================================
-- PASSO 1: Tornar description e instructor opcionais em courses
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses'
      AND column_name = 'description' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.courses ALTER COLUMN description DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses'
      AND column_name = 'instructor' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.courses ALTER COLUMN instructor DROP NOT NULL;
  END IF;
END $$;

-- ============================================
-- PASSO 2: Adicionar colunas novas em courses
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'slug'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN slug TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'subtitle'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN subtitle TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN author_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Unique index on slug (parcial pra permitir nulls iniciais)
CREATE UNIQUE INDEX IF NOT EXISTS courses_slug_unique
  ON public.courses (slug) WHERE slug IS NOT NULL;

-- ============================================
-- PASSO 3: Backfill de slug pros cursos existentes
-- ============================================
UPDATE public.courses
SET slug = lower(
  regexp_replace(
    regexp_replace(
      unaccent(title),
      '[^a-zA-Z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  )
) || '-' || substring(id::text, 1, 6)
WHERE slug IS NULL;

-- ============================================
-- PASSO 4: Trigger updated_at em courses
-- ============================================
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

-- ============================================
-- PASSO 5: Materiais de apoio em lessons
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'materials'
  ) THEN
    ALTER TABLE public.lessons ADD COLUMN materials JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'chapter'
  ) THEN
    ALTER TABLE public.lessons ADD COLUMN chapter TEXT;
  END IF;
END $$;

-- Permitir content_url e content NULL (lessons antigas podem ter content NOT NULL)
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

-- ============================================
-- PASSO 6: RLS de courses/modules/lessons -> Admin only para escrita
--   Leitura segue aberta pra todos os autenticados.
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can manage modules" ON public.modules;
DROP POLICY IF EXISTS "Authenticated users can manage lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
DROP POLICY IF EXISTS "Authenticated can read courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated can read modules" ON public.modules;
DROP POLICY IF EXISTS "Authenticated can read lessons" ON public.lessons;

-- Leitura: qualquer autenticado
CREATE POLICY "Authenticated can read courses"
  ON public.courses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can read modules"
  ON public.modules FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can read lessons"
  ON public.lessons FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Escrita: apenas Admin
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

-- ============================================
-- PASSO 7: RLS de tasks -> Admin only (módulo restrito por ora)
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;

CREATE POLICY "Admins can manage tasks"
  ON public.tasks FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin');

-- ============================================
-- Verificação
-- ============================================
SELECT
  table_name,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('courses', 'lessons')
  AND column_name IN ('description', 'instructor', 'slug', 'subtitle', 'is_published',
                      'updated_at', 'author_id', 'materials', 'chapter', 'content')
ORDER BY table_name, column_name;

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('courses', 'modules', 'lessons', 'tasks')
ORDER BY tablename, policyname;
