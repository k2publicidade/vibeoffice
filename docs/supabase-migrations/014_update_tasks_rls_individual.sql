-- ============================================
-- Migration 014: Tarefas Completamente Individuais
-- Data: 2026-01-07
-- Descrição: Ajustar RLS para que Colaboradores vejam apenas tarefas atribuídas a eles
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Admins have full access to tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers can manage own sector tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers can view other sectors tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view own sector tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks in own sector" ON public.tasks;

-- ============================================
-- NOVAS POLICIES - TAREFAS INDIVIDUAIS
-- ============================================

-- 1. ADMIN: Acesso total a todas as tarefas
CREATE POLICY "Admins have full access to tasks"
  ON public.tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- 2. GERENTE: Pode gerenciar tarefas do próprio setor
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

-- 3. COLABORADOR: Pode ver APENAS tarefas atribuídas a ele
CREATE POLICY "Users can view assigned tasks"
  ON public.tasks
  FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

-- 4. COLABORADOR: Pode atualizar APENAS tarefas atribuídas a ele
CREATE POLICY "Users can update assigned tasks"
  ON public.tasks
  FOR UPDATE
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- 5. COLABORADOR: Pode deletar APENAS tarefas criadas por ele (se não atribuídas a outros)
CREATE POLICY "Users can delete own tasks"
  ON public.tasks
  FOR DELETE
  USING (
    created_by = auth.uid()
    AND (assigned_to IS NULL OR assigned_to = auth.uid())
  );

-- 6. QUALQUER USUÁRIO: Pode criar tarefas no próprio setor
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
-- VERIFICAÇÃO
-- ============================================

-- Verificar policies criadas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY policyname;

-- Teste de permissões por role
-- (Execute cada SELECT separadamente para ver o resultado)

-- Como Admin (vê todas)
-- SELECT COUNT(*) as total_tasks FROM public.tasks;

-- Como Gerente (vê do setor)
-- SELECT COUNT(*) as tasks_setor FROM public.tasks;

-- Como Colaborador (vê apenas atribuídas a ele)
-- SELECT COUNT(*) as minhas_tasks FROM public.tasks WHERE assigned_to = auth.uid();
