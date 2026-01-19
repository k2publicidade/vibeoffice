-- ============================================
-- Migration 028: Remover Restrições de Role
-- Data: 2026-01-19
-- Descrição: Permitir que todos os cargos acessem todos os módulos
-- ============================================

-- ============================================
-- PASSO 1: REMOVER POLÍTICAS ANTIGAS DE AVISOS
-- ============================================

-- Remover políticas de INSERT restritas
DROP POLICY IF EXISTS "Admin can create all announcements" ON public.company_announcements;
DROP POLICY IF EXISTS "Manager can create announcements for own sector" ON public.company_announcements;

-- Remover políticas de UPDATE restritas
DROP POLICY IF EXISTS "Admin can update all announcements" ON public.company_announcements;
DROP POLICY IF EXISTS "Manager can update own sector announcements" ON public.company_announcements;

-- Remover políticas de DELETE restritas
DROP POLICY IF EXISTS "Admin can delete all announcements" ON public.company_announcements;
DROP POLICY IF EXISTS "Manager can delete own sector announcements" ON public.company_announcements;


-- ============================================
-- PASSO 2: CRIAR NOVAS POLÍTICAS DE AVISOS (SEM RESTRIÇÃO DE ROLE)
-- ============================================

-- Política INSERT: Qualquer usuário autenticado pode criar avisos
CREATE POLICY "Authenticated users can create announcements"
  ON public.company_announcements
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política UPDATE: Qualquer usuário autenticado pode atualizar avisos
CREATE POLICY "Authenticated users can update announcements"
  ON public.company_announcements
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política DELETE: Qualquer usuário autenticado pode deletar avisos
CREATE POLICY "Authenticated users can delete announcements"
  ON public.company_announcements
  FOR DELETE
  USING (auth.uid() IS NOT NULL);


-- ============================================
-- PASSO 3: REMOVER POLÍTICAS ANTIGAS DE CURSOS
-- ============================================

-- Remover políticas Admin-only de cursos, módulos e lições
DROP POLICY IF EXISTS "Admins can insert/update/delete courses" ON courses;
DROP POLICY IF EXISTS "Admins can insert/update/delete modules" ON modules;
DROP POLICY IF EXISTS "Admins can insert/update/delete lessons" ON lessons;


-- ============================================
-- PASSO 4: CRIAR NOVAS POLÍTICAS DE CURSOS (SEM RESTRIÇÃO DE ROLE)
-- ============================================

-- Política para COURSES: Qualquer usuário autenticado pode gerenciar
CREATE POLICY "Authenticated users can manage courses"
  ON courses
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política para MODULES: Qualquer usuário autenticado pode gerenciar
CREATE POLICY "Authenticated users can manage modules"
  ON modules
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política para LESSONS: Qualquer usuário autenticado pode gerenciar
CREATE POLICY "Authenticated users can manage lessons"
  ON lessons
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);


-- ============================================
-- PASSO 5: REMOVER POLÍTICAS ANTIGAS DE TASKS
-- ============================================

-- Remover políticas que restringem por role
DROP POLICY IF EXISTS "Admins have full access to tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers can manage own sector tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks in own sector" ON public.tasks;


-- ============================================
-- PASSO 6: CRIAR NOVAS POLÍTICAS DE TASKS (SEM RESTRIÇÃO DE ROLE)
-- ============================================

-- Política para TASKS: Qualquer usuário autenticado pode gerenciar todas as tarefas
CREATE POLICY "Authenticated users can manage tasks"
  ON public.tasks
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);


-- ============================================
-- PASSO 7: REMOVER POLÍTICAS ANTIGAS DE TICKETS
-- ============================================

-- Remover políticas que restringem por role
DROP POLICY IF EXISTS "Admins have full access to tickets" ON public.tickets;
DROP POLICY IF EXISTS "Managers can manage own sector tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can update assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can delete own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;


-- ============================================
-- PASSO 8: CRIAR NOVAS POLÍTICAS DE TICKETS (SEM RESTRIÇÃO DE ROLE)
-- ============================================

-- Política para TICKETS: Qualquer usuário autenticado pode gerenciar todos os tickets
CREATE POLICY "Authenticated users can manage tickets"
  ON public.tickets
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);


-- ============================================
-- PASSO 9: VERIFICAÇÃO FINAL
-- ============================================

-- Verificar políticas criadas para company_announcements
SELECT
  tablename,
  policyname,
  cmd as comando,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'company_announcements'
ORDER BY policyname;

-- Verificar políticas criadas para courses
SELECT
  tablename,
  policyname,
  cmd as comando,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('courses', 'modules', 'lessons')
ORDER BY tablename, policyname;

-- Verificar políticas criadas para tasks
SELECT
  tablename,
  policyname,
  cmd as comando,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tasks'
ORDER BY policyname;

-- Verificar políticas criadas para tickets
SELECT
  tablename,
  policyname,
  cmd as comando,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tickets'
ORDER BY policyname;


-- ============================================
-- OBSERVAÇÕES FINAIS
-- ============================================

-- Esta migration:
-- ✅ Remove TODAS as restrições de role em:
--    - company_announcements (avisos)
--    - courses, modules, lessons (cursos)
--    - tasks (tarefas)
--    - tickets (solicitações)
--
-- ✅ Permite que TODOS os usuários autenticados possam:
--    - Criar, visualizar, editar e deletar avisos
--    - Criar, visualizar, editar e deletar cursos, módulos e lições
--    - Criar, visualizar, editar e deletar tarefas
--    - Criar, visualizar, editar e deletar tickets/solicitações
--
-- ✅ Mantém a segurança básica: apenas usuários autenticados têm acesso
--
-- IMPORTANTE:
-- - Usuários não autenticados NÃO têm acesso de escrita
-- - Apenas a autenticação é verificada (auth.uid() IS NOT NULL)
-- - Não há mais distinção entre Admin, Gerente e Colaborador
-- - Todos os cargos têm acesso igual a todos os módulos
--
-- Reversão (se necessário):
-- Para reverter, execute novamente as migrations originais:
-- - 017_clean_all_tasks_policies.sql
-- - 018_clean_all_tickets_policies.sql
-- - 021_company_announcements.sql
-- - 023_courses_module.sql
