-- ============================================
-- Migration 038: Collaborator internal demand task creation
-- Date: 2026-05-18
--
-- Regra de negócio:
--   - Colaboradores podem criar tarefas/demandas internas a partir da tela /tasks.
--   - A tarefa criada pelo colaborador deve ficar automaticamente vinculada a ele.
--   - Colaboradores não podem vincular outro usuário como responsável.
--   - Admin continua com acesso/gestão total.
--
-- Observação: a migration 036 restringiu task_assignees a Admin. Esta migration
-- abre apenas o caso seguro de auto-vínculo na criação da própria demanda.
-- ============================================

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- Permite que um colaborador crie a própria demanda interna.
-- A task recém-criada ainda não tem task_assignees no instante do INSERT,
-- por isso a autorização de criação é baseada em created_by = auth.uid().
DROP POLICY IF EXISTS "Collaborators can create own internal tasks" ON public.tasks;
CREATE POLICY "Collaborators can create own internal tasks"
  ON public.tasks
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'Colaborador'
    )
  );

-- Permite que o criador leia a própria task durante/apos o fluxo de criação.
-- O app insere imediatamente task_assignees(user_id = auth.uid()), então a policy
-- principal de leitura por responsável continua sendo a fonte de verdade da lista.
DROP POLICY IF EXISTS "Users can view tasks created by themselves" ON public.tasks;
CREATE POLICY "Users can view tasks created by themselves"
  ON public.tasks
  FOR SELECT
  USING (created_by = auth.uid());

-- Permite somente auto-vínculo do colaborador em tasks criadas por ele.
-- Isso impede que um colaborador:
--   1) atribua a demanda a outro usuário;
--   2) se atribua a uma task criada por outra pessoa.
DROP POLICY IF EXISTS "Collaborators can self assign own internal tasks" ON public.task_assignees;
CREATE POLICY "Collaborators can self assign own internal tasks"
  ON public.task_assignees
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.users u ON u.id = auth.uid()
      WHERE t.id = task_assignees.task_id
        AND t.created_by = auth.uid()
        AND u.role = 'Colaborador'
    )
  );

-- Verificação rápida esperada após aplicar:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename IN ('tasks', 'task_assignees')
-- ORDER BY tablename, policyname;
