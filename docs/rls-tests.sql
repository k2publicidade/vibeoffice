-- ============================================================
-- VIBEDISTRO - RLS TESTING SUITE
-- Script de Testes para Validar Configuração de RLS
-- ============================================================
--
-- INSTRUÇÕES:
-- 1. Execute cada teste abaixo em uma sessão separada
-- 2. Você pode logar como diferentes usuários para testar
-- 3. Comentários explicam o que esperar em cada teste
--
-- ⚠️ IMPORTANTE:
-- - RLS bloqueia dados em nível de banco de dados
-- - Se uma query retorna 0 linhas = acesso negado por RLS
-- - Se uma query retorna erro = erro de SQL ou constraint
--

-- ============================================================
-- TESTE 1: Verificar que RLS está habilitado
-- ============================================================

-- Listar todas as tabelas com status de RLS
SELECT
  schemaname,
  tablename,
  rowsecurity as "RLS Habilitado"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'users', 'tasks', 'tickets', 'ticket_history',
  'ticket_comments', 'chat_rooms', 'messages',
  'drive_items', 'shared_access', 'courses',
  'lessons', 'course_progress', 'calendar_events'
)
ORDER BY tablename;

-- Resultado esperado: rowsecurity = true para TODAS


-- ============================================================
-- TESTE 2: Contar Políticas Criadas
-- ============================================================

-- Contar políticas por tabela
SELECT
  tablename,
  COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Resultado esperado:
-- calendar_events | 9
-- chat_rooms | 4
-- course_progress | 5
-- courses | 4
-- drive_items | 7
-- lessons | 4
-- messages | 2
-- shared_access | 4
-- tasks | 6
-- ticket_comments | 4
-- ticket_history | 2
-- tickets | 4
-- users | 4


-- ============================================================
-- TESTE 3: Verificar Funções Auxiliares
-- ============================================================

-- Listar funções criadas
SELECT
  proname as "Nome da Função",
  prosrc as "Código"
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('is_admin', 'is_manager', 'get_user_sector', 'user_in_sector')
ORDER BY proname;

-- Resultado esperado: 4 funções listadas


-- ============================================================
-- TESTE 4: Testar Acesso como Admin
-- ============================================================

-- ⚠️ Execute isto como um usuário Admin:
-- Email: eu@vibedistro.com
-- Senha: password123

-- 4.1: Admin deveria ver TODAS as tarefas
SELECT COUNT(*) as "Total de Tarefas"
FROM public.tasks;

-- 4.2: Admin deveria ver TODOS os tickets
SELECT COUNT(*) as "Total de Tickets"
FROM public.tickets;

-- 4.3: Admin deveria ver TODOS os usuários
SELECT COUNT(*) as "Total de Usuários"
FROM public.users;

-- 4.4: Admin deveria ver TODOS os eventos
SELECT COUNT(*) as "Total de Eventos"
FROM public.calendar_events;

-- Resultado esperado: números > 0 para todos


-- ============================================================
-- TESTE 5: Testar Acesso como Manager
-- ============================================================

-- ⚠️ Execute isto como um Manager de um setor específico:
-- Email: joao.silva@vibedistro.com (Manager - A&R)
-- Senha: password123

-- 5.1: Manager deveria ver tarefas de seu setor
SELECT COUNT(*) as "Tarefas do Meu Setor"
FROM public.tasks
WHERE sector = (SELECT sector FROM public.users WHERE id = auth.uid());

-- 5.2: Manager deveria VER (mas não editar) tarefas de outros setores
SELECT COUNT(*) as "Tarefas de Outros Setores (Leitura)"
FROM public.tasks
WHERE sector != (SELECT sector FROM public.users WHERE id = auth.uid());

-- 5.3: Manager deveria ver todos os usuários
SELECT COUNT(*) as "Total de Usuários"
FROM public.users;

-- 5.4: Manager deveria ver todos os tickets
SELECT COUNT(*) as "Total de Tickets"
FROM public.tickets;

-- Resultado esperado:
-- - Tarefas do próprio setor: > 0
-- - Tarefas de outros setores: > 0
-- - Total de usuários: > 0
-- - Total de tickets: > 0


-- ============================================================
-- TESTE 6: Testar Acesso como Colaborador
-- ============================================================

-- ⚠️ Execute isto como um Colaborador:
-- Email: maria.santos@vibedistro.com (Colaborador - Marketing)
-- Senha: password123

-- 6.1: Colaborador deveria ver tarefas de seu setor
SELECT COUNT(*) as "Tarefas do Meu Setor"
FROM public.tasks
WHERE sector = (SELECT sector FROM public.users WHERE id = auth.uid());

-- 6.2: Colaborador NÃO deveria ver tarefas de outros setores (deve retornar 0)
SELECT COUNT(*) as "Tarefas de Outros Setores (DEVE SER 0)"
FROM public.tasks
WHERE sector != (SELECT sector FROM public.users WHERE id = auth.uid());

-- 6.3: Colaborador deveria ver seus próprios tickets
SELECT COUNT(*) as "Meus Tickets"
FROM public.tickets
WHERE requester = auth.uid();

-- 6.4: Colaborador NÃO deveria ver tickets de outros
SELECT COUNT(*) as "Tickets de Outros (DEVE SER 0)"
FROM public.tickets
WHERE requester != auth.uid();

-- 6.5: Colaborador deveria poder ver próprio progresso de cursos
SELECT COUNT(*) as "Meu Progresso em Cursos"
FROM public.course_progress
WHERE user_id = auth.uid();

-- Resultado esperado:
-- - Tarefas do meu setor: > 0
-- - Tarefas de outros: 0 ✅
-- - Meus tickets: > 0 ou 0 (depende se criou)
-- - Tickets de outros: 0 ✅
-- - Meu progresso: 0 ou mais


-- ============================================================
-- TESTE 7: Testar Isolamento de Dados Sensíveis
-- ============================================================

-- 7.1: Tente ver tarefas que não tem acesso (como Colaborador)
-- Execute como: maria.santos@vibedistro.com
SELECT
  id,
  title,
  sector
FROM public.tasks
WHERE sector = 'Financeiro'
LIMIT 5;

-- Resultado esperado: 0 linhas (RLS bloqueou)


-- 7.2: Tente ver tickets de outro usuário (como Colaborador)
-- Execute como: maria.santos@vibedistro.com
SELECT
  id,
  title,
  requester
FROM public.tickets
WHERE requester != auth.uid()
LIMIT 5;

-- Resultado esperado: 0 linhas (RLS bloqueou)


-- ============================================================
-- TESTE 8: Testar Chat Rooms
-- ============================================================

-- 8.1: Visualizar salas que você participa
SELECT
  id,
  name,
  type,
  participants
FROM public.chat_rooms
WHERE auth.uid() = ANY(participants);

-- Resultado esperado: Apenas salas que você está


-- 8.2: Tentar visualizar salas que NÃO participa
-- (Este teste verifica se RLS está funcionando)
SELECT
  id,
  name,
  type
FROM public.chat_rooms
WHERE NOT (auth.uid() = ANY(participants))
LIMIT 5;

-- Resultado esperado: 0 linhas (RLS bloqueou)


-- ============================================================
-- TESTE 9: Testar Drive (Arquivos)
-- ============================================================

-- 9.1: Visualizar arquivos públicos
SELECT
  id,
  name,
  is_public
FROM public.drive_items
WHERE is_public = true;

-- Resultado esperado: Pode ver arquivos públicos


-- 9.2: Visualizar arquivos do próprio setor
SELECT
  id,
  name,
  sector
FROM public.drive_items
WHERE sector = (SELECT sector FROM public.users WHERE id = auth.uid());

-- Resultado esperado: Arquivos do seu setor


-- 9.3: Visualizar arquivos compartilhados
SELECT
  di.id,
  di.name,
  sa.permission
FROM public.drive_items di
JOIN public.shared_access sa ON di.id = sa.item_id
WHERE sa.user_id = auth.uid();

-- Resultado esperado: Arquivos compartilhados com você


-- ============================================================
-- TESTE 10: Testar Cursos
-- ============================================================

-- 10.1: Qualquer um deveria ver cursos
SELECT COUNT(*) as "Total de Cursos"
FROM public.courses;

-- Resultado esperado: > 0


-- 10.2: Você deveria ver seu próprio progresso
SELECT
  cp.progress,
  c.title
FROM public.course_progress cp
JOIN public.courses c ON cp.course_id = c.id
WHERE cp.user_id = auth.uid();

-- Resultado esperado: Seus cursos


-- 10.3: Tentar ver progresso de outro usuário
SELECT
  cp.progress,
  c.title
FROM public.course_progress cp
JOIN public.courses c ON cp.course_id = c.id
WHERE cp.user_id != auth.uid()
LIMIT 5;

-- Resultado esperado: 0 linhas (RLS bloqueou)


-- ============================================================
-- TESTE 11: Testar Permissões de Escrita
-- ============================================================

-- 11.1: Criar uma tarefa (teste CRUD)
-- Execute como qualquer usuário
INSERT INTO public.tasks (
  title,
  description,
  sector,
  created_by,
  priority,
  status
)
VALUES (
  'Teste RLS - Tarefa Criada ' || NOW()::TEXT,
  'Esta é uma tarefa de teste',
  (SELECT sector FROM public.users WHERE id = auth.uid()),
  auth.uid(),
  'medium',
  'todo'
)
RETURNING id;

-- Resultado esperado: ID gerado = sucesso


-- 11.2: Atualizar a tarefa que você criou
-- Copie o ID da tarefa anterior
UPDATE public.tasks
SET title = 'Tarefa Atualizada'
WHERE id = 'PASTE_ID_HERE'
AND created_by = auth.uid();

-- Resultado esperado: 1 linhas afetada


-- 11.3: Tentar atualizar tarefa de outro usuário (Colaborador)
-- Execute como maria.santos@vibedistro.com
UPDATE public.tasks
SET title = 'Hack Attempt'
WHERE created_by != auth.uid()
LIMIT 1;

-- Resultado esperado: 0 linhas afetadas (RLS bloqueou)


-- 11.4: Deletar a tarefa que você criou
-- Copie o ID da tarefa anterior
DELETE FROM public.tasks
WHERE id = 'PASTE_ID_HERE'
AND created_by = auth.uid();

-- Resultado esperado: 1 linhas deletada


-- ============================================================
-- TESTE 12: Testar Funções Auxiliares
-- ============================================================

-- 12.1: Testar is_admin()
SELECT
  email,
  role,
  public.is_admin(id) as "É Admin"
FROM public.users
WHERE role = 'Admin'
LIMIT 1;

-- Resultado esperado: É Admin = true


-- 12.2: Testar is_manager()
SELECT
  email,
  role,
  public.is_manager(id) as "É Manager"
FROM public.users
WHERE role = 'Gerente'
LIMIT 1;

-- Resultado esperado: É Manager = true


-- 12.3: Testar get_user_sector()
SELECT
  email,
  sector,
  public.get_user_sector(id) as "Setor"
FROM public.users
WHERE id = auth.uid();

-- Resultado esperado: Setor do usuário atual


-- 12.4: Testar user_in_sector()
SELECT
  email,
  sector,
  public.user_in_sector(id, 'Marketing') as "Está em Marketing"
FROM public.users
WHERE id = auth.uid();

-- Resultado esperado: true ou false


-- ============================================================
-- TESTE 13: Audit Trail
-- ============================================================

-- 13.1: Ver histórico de alterações em tickets
SELECT
  th.action,
  th.previous_value,
  th.new_value,
  u.email as "Alterado por",
  th.timestamp
FROM public.ticket_history th
JOIN public.users u ON th.changed_by = u.id
WHERE EXISTS (
  SELECT 1 FROM public.tickets t
  WHERE t.id = th.ticket_id
  AND (t.requester = auth.uid() OR t.assigned_to = auth.uid())
)
LIMIT 10;

-- Resultado esperado: Histórico de seus tickets


-- ============================================================
-- TESTE 14: Performance de Queries
-- ============================================================

-- 14.1: Verificar se query usa indexes
EXPLAIN ANALYZE
SELECT * FROM public.tasks
WHERE sector = 'Marketing'
LIMIT 10;

-- Resultado esperado: Seq Scan OR Index Scan (Index é melhor)


-- 14.2: Verificar speed de acesso com filtro
EXPLAIN ANALYZE
SELECT COUNT(*) FROM public.tasks
WHERE assigned_to = auth.uid();

-- Resultado esperado: < 100ms para 1000+ linhas


-- ============================================================
-- TESTE 15: Cleanup
-- ============================================================

-- Deletar tarefas de teste criadas
DELETE FROM public.tasks
WHERE title LIKE 'Teste RLS - Tarefa Criada%'
AND created_by = auth.uid();

-- Resultado esperado: N linhas deletadas


-- ============================================================
-- RESUMO DOS TESTES
-- ============================================================

/*

CHECKLIST DE VALIDAÇÃO:

Estrutura:
☑ RLS habilitado em 13 tabelas
☑ 70+ políticas criadas
☑ 4 funções auxiliares criadas

Acesso Admin:
☑ Vê tudo
☑ Pode criar/editar/deletar tudo
☑ Acesso total a todos os setores

Acesso Manager:
☑ Vê todo seu setor
☑ Pode ver (somente ler) outros setores
☑ Pode gerenciar seu setor
☑ Não pode editar outras setores

Acesso Colaborador:
☑ Vê apenas seu setor
☑ Não consegue acessar dados de outros setores
☑ Pode atualizar tarefas atribuídas
☑ Acesso limitado a tickets e drive

Isolamento de Dados:
☑ Setores são isolados
☑ Usuários não conseguem acessar dados sensíveis
☑ Compartilhamento respeitado
☑ Histórico protegido

CRUD Operations:
☑ SELECT: Funciona com filtros RLS
☑ INSERT: Respeita restrições (setor, propriedade)
☑ UPDATE: Apenas para propriedários/atribuídos
☑ DELETE: Apenas para propriedários

Performance:
☑ Queries retornam em < 100ms
☑ Indexes estão sendo usados
☑ Sem N+1 queries

*/

-- ============================================================
-- COMANDOS ÚTEIS PARA DEBUG
-- ============================================================

-- Ver qual é seu user_id
SELECT auth.uid();

-- Ver seu perfil
SELECT * FROM public.users WHERE id = auth.uid();

-- Ver quantas coisas você pode ver
SELECT
  'Tasks' as tabela, COUNT(*) as count FROM public.tasks
UNION ALL
SELECT 'Tickets', COUNT(*) FROM public.tickets
UNION ALL
SELECT 'Users', COUNT(*) FROM public.users
UNION ALL
SELECT 'Chat Rooms', COUNT(*) FROM public.chat_rooms
UNION ALL
SELECT 'Messages', COUNT(*) FROM public.messages
UNION ALL
SELECT 'Drive Items', COUNT(*) FROM public.drive_items
UNION ALL
SELECT 'Courses', COUNT(*) FROM public.courses
UNION ALL
SELECT 'Events', COUNT(*) FROM public.calendar_events;

-- Listar todas as policies
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================
-- FIM DOS TESTES
-- ============================================================
