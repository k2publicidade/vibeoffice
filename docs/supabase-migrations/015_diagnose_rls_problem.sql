-- ============================================
-- DIAGNÓSTICO: Por que RLS não está funcionando?
-- Execute este script no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. VERIFICAR SE RLS ESTÁ HABILITADO
-- ============================================
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'tasks';

-- Resultado esperado: rls_enabled = true
-- Se false, executar: ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;


-- ============================================
-- 2. LISTAR TODAS AS POLICIES DA TABELA TASKS
-- ============================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tasks'
ORDER BY policyname;

-- Deve mostrar EXATAMENTE 6 policies:
-- 1. Admins have full access to tasks
-- 2. Managers can manage own sector tasks
-- 3. Users can create tasks in own sector
-- 4. Users can delete own tasks
-- 5. Users can update assigned tasks
-- 6. Users can view assigned tasks


-- ============================================
-- 3. TESTAR auth.uid() - VOCÊ ESTÁ AUTENTICADO?
-- ============================================
SELECT
  auth.uid() as meu_user_id,
  current_user as postgres_user;

-- Resultado esperado:
-- meu_user_id: UUID do usuário logado (ex: 123e4567-e89b-12d3-a456-426614174000)
-- postgres_user: authenticator ou postgres

-- Se meu_user_id = NULL, você NÃO ESTÁ AUTENTICADO!
-- Isso significa que o frontend não está enviando o token JWT corretamente.


-- ============================================
-- 4. VERIFICAR PERFIL DO USUÁRIO LOGADO
-- ============================================
SELECT
  id,
  email,
  name,
  role,
  sector
FROM public.users
WHERE id = auth.uid();

-- Deve retornar SEU perfil
-- Se retornar vazio, você não tem perfil na tabela users!


-- ============================================
-- 5. CONTAR TAREFAS QUE VOCÊ DEVERIA VER
-- ============================================
-- Substitua 'SEU_EMAIL_AQUI' pelo email do usuário logado
SELECT
  'Tarefas atribuídas a mim' as tipo,
  COUNT(*) as total
FROM public.tasks t
WHERE t.assigned_to = (SELECT id FROM public.users WHERE email = 'clawber.brasil@vibedistro.com')

UNION ALL

SELECT
  'Tarefas criadas por mim' as tipo,
  COUNT(*) as total
FROM public.tasks t
WHERE t.created_by = (SELECT id FROM public.users WHERE email = 'clawber.brasil@vibedistro.com')

UNION ALL

SELECT
  'Total de tarefas no sistema' as tipo,
  COUNT(*) as total
FROM public.tasks;


-- ============================================
-- 6. TESTAR RLS MANUALMENTE
-- ============================================
-- Este SELECT vai respeitar as RLS policies
-- Execute como USUÁRIO AUTENTICADO no frontend
SELECT
  id,
  title,
  assigned_to,
  created_by,
  sector,
  status
FROM public.tasks;

-- ADMIN: Deve ver todas as tarefas
-- GERENTE: Deve ver tarefas do setor
-- COLABORADOR: Deve ver apenas tarefas atribuídas a ele


-- ============================================
-- 7. VERIFICAR SE HÁ BYPASS DE RLS
-- ============================================
-- Algumas roles podem ter BYPASSRLS ativo
SELECT
  rolname,
  rolsuper,
  rolbypassrls
FROM pg_roles
WHERE rolname IN ('postgres', 'authenticator', 'anon', 'authenticated', 'service_role');

-- Se 'authenticated' tiver rolbypassrls = true, RLS NÃO FUNCIONA!
-- Nesse caso, executar: ALTER ROLE authenticated NOBYPASSRLS;


-- ============================================
-- 8. RESULTADO ESPERADO
-- ============================================

/*
CENÁRIO 1: Colaborador (ex: Doitvo) logado
- auth.uid() = UUID do Doitvo
- SELECT * FROM tasks → Retorna APENAS tarefas onde:
  - assigned_to = Doitvo.id OU
  - created_by = Doitvo.id

CENÁRIO 2: Admin (ex: Clawber) logado
- auth.uid() = UUID do Clawber
- SELECT * FROM tasks → Retorna TODAS as tarefas (policy Admin permite)

CENÁRIO 3: Gerente (ex: Leitteian) logado
- auth.uid() = UUID do Leitteian
- SELECT * FROM tasks → Retorna tarefas do setor dele
*/


-- ============================================
-- 9. SOLUÇÃO COMUM: FORÇAR RLS
-- ============================================
-- Se RLS não está habilitado, habilitar:
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Se 'authenticated' role tem bypass, remover:
ALTER ROLE authenticated NOBYPASSRLS;

-- Recriar policies se necessário (voltar e executar migration 014)
