-- ============================================
-- Migration 037: Ticket visibility follows Kanban task assignees
-- Date: 2026-05-18
--
-- Regra de negócio:
--   - Tickets são espelhos das tarefas registradas no Kanban.
--   - Admin vê todos os tickets.
--   - Colaborador vê apenas tickets cuja task vinculada esteja atribuída a ele
--     em public.task_assignees.
--   - Tickets sem task vinculada ou com task sem responsável não aparecem para
--     colaboradores.
--
-- Observação: migrations antigas deixaram uma policy genérica
-- "Authenticated users can manage tickets", que permitia qualquer usuário
-- autenticado ver todos os tickets. Esta migration remove essa policy.
-- ============================================

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas/conflitantes
DROP POLICY IF EXISTS "Authenticated users can manage tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins have full access to tickets" ON public.tickets;
DROP POLICY IF EXISTS "Managers can manage own sector tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can update assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can delete own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins and Managers can manage all tickets" ON public.tickets;
DROP POLICY IF EXISTS "pub_tickets_select" ON public.tickets;
DROP POLICY IF EXISTS "pub_tickets_insert" ON public.tickets;
DROP POLICY IF EXISTS "pub_tickets_update" ON public.tickets;
DROP POLICY IF EXISTS "pub_tickets_delete" ON public.tickets;

-- Admin: acesso total
CREATE POLICY "Admins have full access to tickets"
  ON public.tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'Admin'
    )
  );

-- Colaborador: SELECT somente se o ticket estiver vinculado a uma task
-- em que ele é responsável no Kanban.
CREATE POLICY "Users can view tickets assigned through kanban task"
  ON public.tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.task_assignees ta
      WHERE ta.task_id = tickets.linked_task_id
        AND ta.user_id = auth.uid()
    )
  );

-- Colaborador: UPDATE somente em tickets cuja task vinculada está atribuída a ele.
CREATE POLICY "Users can update tickets assigned through kanban task"
  ON public.tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.task_assignees ta
      WHERE ta.task_id = tickets.linked_task_id
        AND ta.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.task_assignees ta
      WHERE ta.task_id = tickets.linked_task_id
        AND ta.user_id = auth.uid()
    )
  );

-- Criação de tickets continua permitida para usuários autenticados porque
-- tickets também podem ser gerados/sincronizados pelo fluxo do app.
CREATE POLICY "Authenticated users can create tickets"
  ON public.tickets
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_tickets_linked_task_visibility
  ON public.tickets(linked_task_id)
  WHERE linked_task_id IS NOT NULL;

COMMENT ON POLICY "Users can view tickets assigned through kanban task" ON public.tickets IS
  'Colaboradores só veem tickets cuja task vinculada tem o usuário em task_assignees.';
