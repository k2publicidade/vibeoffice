-- ============================================
-- Migration 018: Tickets Completamente Individuais
-- Data: 2026-01-07
-- Descrição: Ajustar RLS para que Colaboradores vejam apenas tickets atribuídos a eles
-- ============================================

-- ============================================
-- PASSO 1: REMOVER TODAS AS POLICIES DE TICKETS
-- ============================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Admins and Managers can manage all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;

-- Remover possíveis policies genéricas conflitantes
DROP POLICY IF EXISTS "pub_tickets_delete" ON public.tickets;
DROP POLICY IF EXISTS "pub_tickets_insert" ON public.tickets;
DROP POLICY IF EXISTS "pub_tickets_select" ON public.tickets;
DROP POLICY IF EXISTS "pub_tickets_update" ON public.tickets;

-- Remover outras possíveis policies antigas
DROP POLICY IF EXISTS "Admins have full access to tickets" ON public.tickets;
DROP POLICY IF EXISTS "Managers can manage own sector tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can update assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can delete own tickets" ON public.tickets;


-- ============================================
-- PASSO 2: GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PASSO 3: RECRIAR APENAS AS 6 POLICIES CORRETAS
-- ============================================

-- 1️⃣ ADMIN: Acesso total a todos os tickets
CREATE POLICY "Admins have full access to tickets"
  ON public.tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- 2️⃣ GERENTE: Pode gerenciar tickets do próprio setor
-- NOTA: Gerente vê tickets onde o REQUESTER é do setor dele
CREATE POLICY "Managers can manage own sector tickets"
  ON public.tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u1
      WHERE u1.id = auth.uid()
        AND u1.role = 'Gerente'
        AND EXISTS (
          SELECT 1 FROM public.users u2
          WHERE u2.id = tickets.requester
            AND u2.sector = u1.sector
        )
    )
  );

-- 3️⃣ COLABORADOR: Pode ver APENAS tickets atribuídos a ele OU criados por ele
CREATE POLICY "Users can view assigned tickets"
  ON public.tickets
  FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR requester = auth.uid()
  );

-- 4️⃣ COLABORADOR: Pode atualizar APENAS tickets atribuídos a ele
CREATE POLICY "Users can update assigned tickets"
  ON public.tickets
  FOR UPDATE
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- 5️⃣ COLABORADOR: Pode deletar APENAS tickets criados por ele (se não atribuídos a outros)
CREATE POLICY "Users can delete own tickets"
  ON public.tickets
  FOR DELETE
  USING (
    requester = auth.uid()
    AND status = 'open'
    AND (assigned_to IS NULL OR assigned_to = auth.uid())
  );

-- 6️⃣ QUALQUER USUÁRIO: Pode criar tickets
CREATE POLICY "Users can create tickets"
  ON public.tickets
  FOR INSERT
  WITH CHECK (requester = auth.uid());


-- ============================================
-- PASSO 4: VERIFICAÇÃO FINAL
-- ============================================

-- Deve retornar EXATAMENTE 6 policies
SELECT
  policyname,
  cmd as comando,
  CASE
    WHEN policyname IN (
      'Admins have full access to tickets',
      'Managers can manage own sector tickets',
      'Users can view assigned tickets',
      'Users can update assigned tickets',
      'Users can delete own tickets',
      'Users can create tickets'
    ) THEN '✅ CORRETO'
    ELSE '❌ POLICY INDESEJADA'
  END as status
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tickets'
ORDER BY policyname;

-- Resultado esperado: 6 linhas, todas com status '✅ CORRETO'


-- ============================================
-- TESTE: CONTAR TICKETS VISÍVEIS
-- ============================================
SELECT
  COUNT(*) as tickets_que_vejo,
  auth.uid() as meu_id,
  (SELECT role FROM public.users WHERE id = auth.uid()) as meu_role,
  (SELECT name FROM public.users WHERE id = auth.uid()) as meu_nome
FROM public.tickets;

-- ADMIN: Deve ver TODOS os tickets
-- GERENTE: Deve ver tickets de requesters do mesmo setor
-- COLABORADOR: Deve ver APENAS tickets atribuídos a ele OU criados por ele
