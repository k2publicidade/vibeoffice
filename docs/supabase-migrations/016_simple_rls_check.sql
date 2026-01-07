-- ============================================
-- VERIFICAÇÃO SIMPLES DE RLS
-- Execute apenas as seções 1, 2 e 3
-- ============================================

-- ============================================
-- SEÇÃO 1: RLS ESTÁ HABILITADO?
-- ============================================
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'tasks';

-- ✅ ESPERADO: rls_enabled = true
-- ❌ SE FALSE: Execute a correção abaixo


-- ============================================
-- SEÇÃO 2: QUANTAS POLICIES EXISTEM?
-- ============================================
SELECT
  policyname,
  cmd as comando,
  CASE
    WHEN policyname = 'Admins have full access to tasks' THEN '✅ Admin'
    WHEN policyname = 'Managers can manage own sector tasks' THEN '✅ Gerente'
    WHEN policyname = 'Users can view assigned tasks' THEN '✅ Ver tarefas'
    WHEN policyname = 'Users can update assigned tasks' THEN '✅ Atualizar'
    WHEN policyname = 'Users can delete own tasks' THEN '✅ Deletar'
    WHEN policyname = 'Users can create tasks in own sector' THEN '✅ Criar'
    ELSE '❌ DESCONHECIDA'
  END as status
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tasks'
ORDER BY policyname;

-- ✅ ESPERADO: 6 policies com status ✅
-- ❌ SE DIFERENTE: Execute migration 014 novamente


-- ============================================
-- SEÇÃO 3: VOCÊ ESTÁ AUTENTICADO?
-- ============================================
SELECT
  auth.uid() as meu_user_id,
  CASE
    WHEN auth.uid() IS NULL THEN '❌ NÃO AUTENTICADO - Problema no frontend!'
    ELSE '✅ Autenticado'
  END as status
FROM (SELECT 1) as dummy;

-- ✅ ESPERADO: meu_user_id = UUID válido
-- ❌ SE NULL: O problema é que o frontend não está enviando o JWT token


-- ============================================
-- CORREÇÃO: SE SEÇÃO 1 MOSTRAR rls_enabled = false
-- ============================================
-- Descomente e execute esta linha:

-- ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;


-- ============================================
-- TESTE FINAL: CONTAR TAREFAS VISÍVEIS
-- ============================================
-- Execute isto DEPOIS de aplicar correções

SELECT
  COUNT(*) as tarefas_que_vejo,
  auth.uid() as meu_id,
  (SELECT role FROM public.users WHERE id = auth.uid()) as meu_role
FROM public.tasks;

-- ADMIN: Deve ver TODAS as tarefas
-- GERENTE: Deve ver tarefas do setor
-- COLABORADOR: Deve ver APENAS as atribuídas a ele
