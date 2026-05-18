-- ============================================
-- Migration 036: Task visibility by responsible user
-- Date: 2026-05-18
--
-- Regra de negócio:
--   - Admin vê todas as tarefas, inclusive sem responsável.
--   - Usuários não-admin só veem tarefas em que estão selecionados
--     como responsáveis em public.task_assignees.
--   - Tarefas sem responsável não aparecem para colaboradores.
--
-- Contexto: desde a migration 024 a fonte da verdade dos responsáveis
-- é public.task_assignees (M2M), não mais tasks.assigned_to.
-- ============================================

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas/amplas e policies legadas que ainda usavam tasks.assigned_to.
DROP POLICY IF EXISTS "pub_tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "pub_tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "pub_tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "pub_tasks_delete" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins have full access to tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers can manage own sector tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers can view other sectors tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view own sector tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks in own sector" ON public.tasks;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.task_assignees;
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.task_assignees;
DROP POLICY IF EXISTS "Admins can manage task assignees" ON public.task_assignees;
DROP POLICY IF EXISTS "Users can read own task assignees" ON public.task_assignees;

-- Admin: acesso total a tasks.
CREATE POLICY "Admins can manage tasks"
  ON public.tasks
  FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin');

-- Não-admin: leitura somente se estiver em task_assignees.
-- Isso exclui automaticamente tarefas sem responsável.
CREATE POLICY "Users can view tasks assigned to them"
  ON public.tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.task_assignees ta
      WHERE ta.task_id = tasks.id
        AND ta.user_id = auth.uid()
    )
  );

-- Não-admin: pode atualizar somente tarefas atribuídas a ele
-- (mantém fluxo de mudar status/andamento da própria tarefa).
CREATE POLICY "Users can update tasks assigned to them"
  ON public.tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.task_assignees ta
      WHERE ta.task_id = tasks.id
        AND ta.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.task_assignees ta
      WHERE ta.task_id = tasks.id
        AND ta.user_id = auth.uid()
    )
  );

-- Responsáveis: Admin gerencia todos; usuário autenticado pode ler apenas
-- vínculos em que ele mesmo é responsável. A criação/remoção de vínculos
-- fica restrita a Admin para impedir colaborador de se auto-atribuir.
CREATE POLICY "Admins can manage task assignees"
  ON public.task_assignees
  FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin');

CREATE POLICY "Users can read own task assignees"
  ON public.task_assignees
  FOR SELECT
  USING (user_id = auth.uid());

-- Verificação rápida esperada após aplicar:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename IN ('tasks', 'task_assignees')
-- ORDER BY tablename, policyname;
