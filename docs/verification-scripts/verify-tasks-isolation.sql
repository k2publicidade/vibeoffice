-- ============================================
-- Script de Verificação: Isolamento de Tarefas
-- Data: 2026-01-07
-- Propósito: Validar RLS policies após migration 014
-- ============================================

-- ========================================
-- PARTE 1: Verificar Policies Instaladas
-- ========================================

SELECT
  policyname,
  cmd,
  CASE
    WHEN cmd = 'ALL' THEN '✓ CRUD Completo'
    WHEN cmd = 'SELECT' THEN '✓ Leitura'
    WHEN cmd = 'INSERT' THEN '✓ Criação'
    WHEN cmd = 'UPDATE' THEN '✓ Atualização'
    WHEN cmd = 'DELETE' THEN '✓ Exclusão'
  END as operacao,
  SUBSTRING(qual::text FROM 1 FOR 60) as condicao_using,
  SUBSTRING(with_check::text FROM 1 FOR 60) as condicao_check
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY
  CASE
    WHEN policyname LIKE '%Admin%' THEN 1
    WHEN policyname LIKE '%Manager%' THEN 2
    ELSE 3
  END,
  policyname;

-- RESULTADO ESPERADO: 6 linhas
-- 1. Admins have full access to tasks (ALL)
-- 2. Managers can manage own sector tasks (ALL)
-- 3. Users can create tasks in own sector (INSERT)
-- 4. Users can delete own tasks (DELETE)
-- 5. Users can update assigned tasks (UPDATE)
-- 6. Users can view assigned tasks (SELECT)

-- ========================================
-- PARTE 2: Contar Tarefas por Usuário
-- ========================================

-- Verificar quantas tarefas cada usuário deveria ver
SELECT
  u.name as usuario,
  u.email,
  u.role,
  u.sector,
  COUNT(DISTINCT t.id) FILTER (WHERE t.assigned_to = u.id) as tarefas_atribuidas,
  COUNT(DISTINCT t2.id) FILTER (WHERE t2.created_by = u.id) as tarefas_criadas,
  COUNT(DISTINCT COALESCE(t.id, t2.id)) as total_visiveis
FROM users u
LEFT JOIN tasks t ON t.assigned_to = u.id
LEFT JOIN tasks t2 ON t2.created_by = u.id
WHERE u.role = 'Colaborador'
GROUP BY u.id, u.name, u.email, u.role, u.sector
ORDER BY u.name
LIMIT 10;

-- INTERPRETAÇÃO:
-- - Colaboradores devem ver: tarefas_atribuidas + tarefas_criadas (sem duplicar)
-- - Se Kevin tem 3 atribuídas e criou 1 (diferente), deve ver 4 no total
-- - Se Amanda tem 2 atribuídas e criou 2 (mesmas), deve ver 2 no total

-- ========================================
-- PARTE 3: Teste de Isolamento Específico
-- ========================================

-- Criar tarefa de teste para Kevin
DO $$
DECLARE
  v_kevin_id UUID;
  v_admin_id UUID;
  v_task_id UUID;
BEGIN
  -- Buscar IDs
  SELECT id INTO v_kevin_id FROM users WHERE email = 'kevin.costa@vibedistro.com';
  SELECT id INTO v_admin_id FROM users WHERE email = 'eu@vibedistro.com';

  -- Criar tarefa atribuída ao Kevin
  INSERT INTO tasks (
    title,
    description,
    status,
    priority,
    assigned_to,
    sector,
    created_by
  ) VALUES (
    '[TESTE] Tarefa Isolamento - ' || NOW()::text,
    'Tarefa criada para teste de RLS policies. Deve ser visível apenas para Kevin e Admins.',
    'todo',
    'high',
    v_kevin_id,
    'Marketing',
    v_admin_id
  ) RETURNING id INTO v_task_id;

  RAISE NOTICE 'Tarefa de teste criada: %', v_task_id;
  RAISE NOTICE 'Atribuída para: Kevin (% - Marketing)', v_kevin_id;
  RAISE NOTICE 'Criada por: Admin (%)', v_admin_id;
END $$;

-- ========================================
-- PARTE 4: Verificar Visibilidade por Role
-- ========================================

-- Como executar este teste:
-- 1. Executar as queries abaixo logado como diferentes usuários
-- 2. Comparar resultados com expectativas

-- TESTE A: Como Admin (deve ver TODAS)
-- Login: eu@vibedistro.com | Senha: password123
-- SELECT COUNT(*) as total_admin FROM tasks;
-- Esperado: >= 1 (todas as tarefas do sistema)

-- TESTE B: Como Gerente de Marketing (deve ver APENAS do setor)
-- Login: joao.silva@vibedistro.com (se for Gerente) | Senha: password123
-- SELECT COUNT(*) as total_gerente FROM tasks WHERE sector = 'Marketing';
-- Esperado: Apenas tarefas de Marketing

-- TESTE C: Como Kevin (deve ver APENAS atribuídas a ele)
-- Login: kevin.costa@vibedistro.com | Senha: password123
-- SELECT COUNT(*) as total_kevin FROM tasks;
-- SELECT title, assigned_to = auth.uid() as is_mine FROM tasks;
-- Esperado: Apenas tarefas onde assigned_to = kevin.id OU created_by = kevin.id

-- TESTE D: Como outro Colaborador de Marketing (NÃO deve ver tarefa do Kevin)
-- Login: maria.santos@vibedistro.com (se for Colaborador) | Senha: password123
-- SELECT COUNT(*) as total_maria FROM tasks;
-- SELECT title FROM tasks WHERE title LIKE '[TESTE]%';
-- Esperado: 0 tarefas de teste (não deve ver a tarefa do Kevin)

-- ========================================
-- PARTE 5: Limpeza
-- ========================================

-- Remover tarefas de teste criadas
DELETE FROM tasks
WHERE title LIKE '[TESTE]%'
RETURNING id, title, assigned_to;

-- ========================================
-- PARTE 6: Diagnóstico de Problemas
-- ========================================

-- Se algum teste falhar, executar este diagnóstico:

-- 6.1. Verificar se RLS está habilitado
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename = 'tasks';
-- Esperado: rls_habilitado = true

-- 6.2. Verificar se policies estão ATIVAS
SELECT
  policyname,
  permissive, -- deve ser 't' (permissiva)
  roles       -- deve ser '{public}' ou similar
FROM pg_policies
WHERE tablename = 'tasks';

-- 6.3. Verificar se auth.uid() está retornando valor
SELECT auth.uid() as current_user_id;
-- Esperado: UUID válido (não NULL)
-- Se retornar NULL, usuário não está autenticado

-- 6.4. Verificar role do usuário atual
SELECT
  id,
  email,
  name,
  role,
  sector
FROM users
WHERE id = auth.uid();
-- Esperado: 1 linha com dados do usuário logado

-- 6.5. Verificar tarefas que deveriam ser visíveis
SELECT
  t.id,
  t.title,
  t.assigned_to,
  t.created_by,
  t.sector,
  u_assigned.name as atribuido_para,
  u_created.name as criado_por,
  -- Condições de visibilidade
  (t.assigned_to = auth.uid()) as eh_atribuida_pra_mim,
  (t.created_by = auth.uid()) as eu_criei,
  (EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'Admin'
  )) as sou_admin,
  (EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'Gerente' AND sector = t.sector
  )) as sou_gerente_do_setor
FROM tasks t
LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
LEFT JOIN users u_created ON t.created_by = u_created.id
LIMIT 20;

-- INTERPRETAÇÃO:
-- - Se "eh_atribuida_pra_mim" = true OU "eu_criei" = true → Colaborador deve ver
-- - Se "sou_admin" = true → Admin deve ver
-- - Se "sou_gerente_do_setor" = true → Gerente deve ver

-- ========================================
-- PARTE 7: Rollback (Apenas se necessário)
-- ========================================

-- SE houver problemas críticos e precisar reverter para policies antigas:
-- ATENÇÃO: Isso REMOVE o isolamento individual! Use apenas em emergência!

/*
-- 1. Remover policies novas
DROP POLICY IF EXISTS "Admins have full access to tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers can manage own sector tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks in own sector" ON public.tasks;

-- 2. Recriar policies antigas (NÃO recomendado - remove isolamento)
CREATE POLICY "Admins have full access to tasks"
  ON public.tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

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

CREATE POLICY "Managers can view other sectors tasks"
  ON public.tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Gerente'
    )
  );

CREATE POLICY "Users can view own sector tasks"
  ON public.tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND sector = tasks.sector
    )
  );

CREATE POLICY "Users can update assigned tasks"
  ON public.tasks
  FOR UPDATE
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

CREATE POLICY "Users can create tasks in own sector"
  ON public.tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND sector = tasks.sector
    )
  );
*/

-- ============================================
-- FIM DO SCRIPT
-- ============================================

-- CHECKLIST DE VALIDAÇÃO:
-- [ ] Parte 1: 6 policies listadas
-- [ ] Parte 2: Contagem de tarefas por colaborador está correta
-- [ ] Parte 3: Tarefa de teste criada com sucesso
-- [ ] Parte 4: Teste A (Admin) - vê todas
-- [ ] Parte 4: Teste B (Gerente) - vê apenas do setor
-- [ ] Parte 4: Teste C (Kevin) - vê apenas atribuídas a ele
-- [ ] Parte 4: Teste D (Maria) - NÃO vê tarefa do Kevin
-- [ ] Parte 5: Tarefas de teste removidas
-- [ ] Parte 6: Diagnóstico executado (apenas se houver falhas)
