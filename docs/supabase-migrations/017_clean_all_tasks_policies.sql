-- ============================================
-- Migration 017: Limpar TODAS as Policies de Tasks
-- Data: 2026-01-07
-- Descrição: Remover policies conflitantes e recriar apenas as 6 corretas
-- ============================================

-- ============================================
-- PASSO 1: REMOVER TODAS AS 10 POLICIES
-- ============================================

-- Remover as 6 policies corretas (para recriar)
DROP POLICY IF EXISTS "Admins have full access to tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers can manage own sector tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks in own sector" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view assigned tasks" ON public.tasks;

-- Remover as 4 policies CONFLITANTES (causando o problema)
DROP POLICY IF EXISTS "pub_tasks_delete" ON public.tasks;
DROP POLICY IF EXISTS "pub_tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "pub_tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "pub_tasks_update" ON public.tasks;

-- Remover qualquer outra policy antiga que possa existir
DROP POLICY IF EXISTS "Managers can view other sectors tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view own sector tasks" ON public.tasks;


-- ============================================
-- PASSO 2: GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PASSO 3: RECRIAR APENAS AS 6 POLICIES CORRETAS
-- ============================================

-- 1️⃣ ADMIN: Acesso total a todas as tarefas
CREATE POLICY "Admins have full access to tasks"
  ON public.tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- 2️⃣ GERENTE: Pode gerenciar tarefas do próprio setor
CREATE POLICY "Managers can manage own sector tasks"
  ON public.tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role = 'Gerente'
        AND sector = tasks.sector
    )
  );

-- 3️⃣ COLABORADOR: Pode ver APENAS tarefas atribuídas a ele
CREATE POLICY "Users can view assigned tasks"
  ON public.tasks
  FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

-- 4️⃣ COLABORADOR: Pode atualizar APENAS tarefas atribuídas a ele
CREATE POLICY "Users can update assigned tasks"
  ON public.tasks
  FOR UPDATE
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- 5️⃣ COLABORADOR: Pode deletar APENAS tarefas criadas por ele
CREATE POLICY "Users can delete own tasks"
  ON public.tasks
  FOR DELETE
  USING (
    created_by = auth.uid()
    AND (assigned_to IS NULL OR assigned_to = auth.uid())
  );

-- 6️⃣ QUALQUER USUÁRIO: Pode criar tarefas no próprio setor
CREATE POLICY "Users can create tasks in own sector"
  ON public.tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND sector = tasks.sector
    )
  );


-- ============================================
-- PASSO 4: VERIFICAÇÃO FINAL
-- ============================================

-- Deve retornar EXATAMENTE 6 policies
SELECT
  policyname,
  cmd as comando,
  CASE
    WHEN policyname IN (
      'Admins have full access to tasks',
      'Managers can manage own sector tasks',
      'Users can view assigned tasks',
      'Users can update assigned tasks',
      'Users can delete own tasks',
      'Users can create tasks in own sector'
    ) THEN '✅ CORRETO'
    ELSE '❌ POLICY INDESEJADA'
  END as status
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tasks'
ORDER BY policyname;

-- Resultado esperado: 6 linhas, todas com status '✅ CORRETO'
