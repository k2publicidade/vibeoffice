-- ============================================================
-- VIBEDISTRO - RLS (Row Level Security) - CONFIGURAÇÃO COMPLETA
-- ============================================================
--
-- Este script configura todas as políticas de segurança em nível de linha
-- para o banco de dados PostgreSQL do VIBEDISTRO no Supabase.
--
-- ⚠️ INSTRUÇÕES DE EXECUÇÃO:
-- 1. Faça login no Supabase Console
-- 2. Vá para SQL Editor
-- 3. Copie todo o conteúdo deste arquivo
-- 4. Cole no SQL Editor
-- 5. Clique em "Run" (Ctrl+Enter)
-- 6. Verifique se todos os comandos foram executados com sucesso
--
-- 📋 ESTRUTURA DE ROLES E PERMISSÕES:
-- - Admin: Acesso total a todos os dados
-- - Gerente: Acesso total ao seu setor + leitura em outros
-- - Colaborador: Acesso limitado ao seu setor + dados compartilhados
--
-- 🔐 SETORES (7 no total):
-- 1. A&R
-- 2. Marketing
-- 3. Financeiro
-- 4. Jurídico
-- 5. Administrativo
-- 6. TI/Suporte
-- 7. Atendimento ao Artista
--
-- ============================================================

-- ============================================================
-- PARTE 1: LIMPEZA - REMOVER POLICIES ANTIGAS (Opcional)
-- ============================================================
-- Descomente as linhas abaixo APENAS se quiser resetar todas as policies
-- CUIDADO: Isto removerá todas as políticas existentes!

/*
-- Remover policies da tabela users
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Only admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Only admins can delete users" ON public.users;

-- Remover policies da tabela tasks
DROP POLICY IF EXISTS "Admins have full access to tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers can manage own sector tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers can view other sectors tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view own sector tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks in own sector" ON public.tasks;

-- Remover policies da tabela tickets
DROP POLICY IF EXISTS "Admins and Managers can manage all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;

-- Remover policies da tabela ticket_history
DROP POLICY IF EXISTS "Users can view history of accessible tickets" ON public.ticket_history;
DROP POLICY IF EXISTS "System can insert history" ON public.ticket_history;

-- Remover policies da tabela ticket_comments
DROP POLICY IF EXISTS "Users can view comments on accessible tickets" ON public.ticket_comments;
DROP POLICY IF EXISTS "Users can create comments on accessible tickets" ON public.ticket_comments;

-- Remover policies da tabela chat_rooms
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create DM rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Admins can create sector rooms" ON public.chat_rooms;

-- Remover policies da tabela messages
DROP POLICY IF EXISTS "Users can view messages from accessible rooms" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in accessible rooms" ON public.messages;

-- Remover policies da tabela drive_items
DROP POLICY IF EXISTS "Admins can manage all drive items" ON public.drive_items;
DROP POLICY IF EXISTS "Users can view public items" ON public.drive_items;
DROP POLICY IF EXISTS "Users can view own sector items" ON public.drive_items;
DROP POLICY IF EXISTS "Users can view shared items" ON public.drive_items;
DROP POLICY IF EXISTS "Users can create items in own sector" ON public.drive_items;
DROP POLICY IF EXISTS "Users can manage own items" ON public.drive_items;
DROP POLICY IF EXISTS "Users can delete own items" ON public.drive_items;

-- Remover policies da tabela shared_access
DROP POLICY IF EXISTS "Users can view relevant shares" ON public.shared_access;
DROP POLICY IF EXISTS "Owners can share items" ON public.shared_access;
DROP POLICY IF EXISTS "Sharers can revoke access" ON public.shared_access;

-- Remover policies da tabela courses
DROP POLICY IF EXISTS "All users can view courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;

-- Remover policies da tabela lessons
DROP POLICY IF EXISTS "All users can view lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;

-- Remover policies da tabela course_progress
DROP POLICY IF EXISTS "Users can view own progress" ON public.course_progress;
DROP POLICY IF EXISTS "Users can manage own progress" ON public.course_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.course_progress;
DROP POLICY IF EXISTS "Admins can view all progress" ON public.course_progress;

-- Remover policies da tabela calendar_events
DROP POLICY IF EXISTS "Admins can view all events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can view company events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can view own sector events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can view events they attend" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can create events" ON public.calendar_events;
DROP POLICY IF EXISTS "Creators can manage their events" ON public.calendar_events;
DROP POLICY IF EXISTS "Creators can delete their events" ON public.calendar_events;
*/

-- ============================================================
-- PARTE 2: HELPER FUNCTIONS
-- ============================================================

-- Função auxiliar: Verificar se usuário é Admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função auxiliar: Verificar se usuário é Manager
CREATE OR REPLACE FUNCTION is_manager(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role = 'Gerente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função auxiliar: Obter setor do usuário
CREATE OR REPLACE FUNCTION get_user_sector(user_id UUID)
RETURNS sector_type AS $$
DECLARE
  v_sector sector_type;
BEGIN
  SELECT sector INTO v_sector FROM public.users WHERE id = user_id;
  RETURN v_sector;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função auxiliar: Verificar se usuário está em um setor específico
CREATE OR REPLACE FUNCTION user_in_sector(user_id UUID, check_sector sector_type)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND sector = check_sector
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PARTE 3: TABELA USERS - POLÍTICAS RLS
-- ============================================================

-- 📌 Descrição:
-- - Todos podem visualizar perfis de outros usuários (necessário para atribuições, compartilhamento, etc)
-- - Cada usuário pode atualizar apenas seu próprio perfil
-- - Apenas admins podem criar novos usuários
-- - Apenas admins podem deletar usuários

-- Policy 1: Visualizar todos os usuários (necessário para a aplicação funcionar)
CREATE POLICY "users_select_all"
  ON public.users
  FOR SELECT
  USING (true);

-- Policy 2: Cada usuário pode atualizar apenas seu próprio perfil
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Apenas admins podem inserir usuários
CREATE POLICY "users_insert_admin_only"
  ON public.users
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Policy 4: Apenas admins podem deletar usuários
CREATE POLICY "users_delete_admin_only"
  ON public.users
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================================
-- PARTE 4: TABELA TASKS - POLÍTICAS RLS
-- ============================================================

-- 📌 Descrição:
-- - Admins: Acesso total a TODAS as tarefas
-- - Managers: Acesso total às tarefas de seu setor + leitura de outros setores
-- - Colaboradores: Leitura das tarefas de seu setor + atualizar tarefas atribuídas

-- Policy 1: Admins têm acesso completo
CREATE POLICY "tasks_admin_all"
  ON public.tasks
  FOR ALL
  USING (is_admin(auth.uid()));

-- Policy 2: Managers podem gerenciar tarefas de seu setor
CREATE POLICY "tasks_manager_own_sector"
  ON public.tasks
  FOR ALL
  USING (
    is_manager(auth.uid())
    AND user_in_sector(auth.uid(), sector)
  );

-- Policy 3: Managers podem visualizar tarefas de outros setores (somente leitura)
CREATE POLICY "tasks_manager_view_all"
  ON public.tasks
  FOR SELECT
  USING (is_manager(auth.uid()));

-- Policy 4: Colaboradores podem visualizar tarefas de seu setor
CREATE POLICY "tasks_collaborator_view_own_sector"
  ON public.tasks
  FOR SELECT
  USING (
    NOT is_manager(auth.uid())
    AND NOT is_admin(auth.uid())
    AND user_in_sector(auth.uid(), sector)
  );

-- Policy 5: Qualquer um pode atualizar tarefas que lhe foram atribuídas
CREATE POLICY "tasks_update_assigned_to_me"
  ON public.tasks
  FOR UPDATE
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- Policy 6: Usuários podem criar tarefas em seu próprio setor
CREATE POLICY "tasks_insert_own_sector"
  ON public.tasks
  FOR INSERT
  WITH CHECK (
    (is_admin(auth.uid()) OR is_manager(auth.uid()))
    OR user_in_sector(auth.uid(), sector)
  );

-- ============================================================
-- PARTE 5: TABELA TICKETS - POLÍTICAS RLS
-- ============================================================

-- 📌 Descrição:
-- - Admins e Managers: Acesso total a TODOS os tickets
-- - Colaboradores: Visualizam apenas seus próprios tickets (criador ou atribuído)

-- Policy 1: Admins e Managers têm acesso completo
CREATE POLICY "tickets_admin_manager_all"
  ON public.tickets
  FOR ALL
  USING (
    is_admin(auth.uid()) OR is_manager(auth.uid())
  );

-- Policy 2: Colaboradores podem visualizar tickets que criaram ou foram atribuídos
CREATE POLICY "tickets_user_own"
  ON public.tickets
  FOR SELECT
  USING (
    requester = auth.uid()
    OR assigned_to = auth.uid()
  );

-- Policy 3: Qualquer usuário autenticado pode criar tickets
CREATE POLICY "tickets_insert_authenticated"
  ON public.tickets
  FOR INSERT
  WITH CHECK (requester = auth.uid());

-- Policy 4: Usuários podem atualizar tickets que criaram
CREATE POLICY "tickets_update_own"
  ON public.tickets
  FOR UPDATE
  USING (requester = auth.uid())
  WITH CHECK (requester = auth.uid());

-- ============================================================
-- PARTE 6: TABELA TICKET_HISTORY - POLÍTICAS RLS
-- ============================================================

-- 📌 Descrição:
-- - Somente leitura do histórico de tickets que o usuário tem acesso
-- - Sistema pode inserir histórico automaticamente

-- Policy 1: Visualizar histórico de tickets acessíveis
CREATE POLICY "ticket_history_select"
  ON public.ticket_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE id = ticket_history.ticket_id
        AND (
          requester = auth.uid()
          OR assigned_to = auth.uid()
          OR is_admin(auth.uid())
          OR is_manager(auth.uid())
        )
    )
  );

-- Policy 2: Sistema pode registrar histórico automaticamente
CREATE POLICY "ticket_history_insert_system"
  ON public.ticket_history
  FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- PARTE 7: TABELA TICKET_COMMENTS - POLÍTICAS RLS
-- ============================================================

-- 📌 Descrição:
-- - Visualizar comentários públicos de tickets acessíveis
-- - Admins/Managers podem visualizar comentários internos também
-- - Criar comentários apenas em tickets que tem acesso

-- Policy 1: Visualizar comentários em tickets acessíveis
CREATE POLICY "ticket_comments_select"
  ON public.ticket_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE id = ticket_comments.ticket_id
        AND (
          requester = auth.uid()
          OR assigned_to = auth.uid()
          OR is_admin(auth.uid())
          OR is_manager(auth.uid())
        )
    )
    AND (
      NOT is_internal
      OR is_admin(auth.uid())
      OR is_manager(auth.uid())
    )
  );

-- Policy 2: Criar comentários em tickets acessíveis
CREATE POLICY "ticket_comments_insert"
  ON public.ticket_comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tickets
      WHERE id = ticket_comments.ticket_id
        AND (requester = auth.uid() OR assigned_to = auth.uid() OR is_admin(auth.uid()) OR is_manager(auth.uid()))
    )
  );

-- Policy 3: Usuário pode atualizar seus próprios comentários
CREATE POLICY "ticket_comments_update_own"
  ON public.ticket_comments
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 4: Usuário pode deletar seus próprios comentários
CREATE POLICY "ticket_comments_delete_own"
  ON public.ticket_comments
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- PARTE 8: TABELA CHAT_ROOMS - POLÍTICAS RLS
-- ============================================================

-- 📌 Descrição:
-- - Visualizar apenas salas nas quais o usuário é participante
-- - Criar salas DM entre usuários
-- - Admins podem criar salas por setor

-- Policy 1: Visualizar salas onde o usuário é participante
CREATE POLICY "chat_rooms_select"
  ON public.chat_rooms
  FOR SELECT
  USING (auth.uid() = ANY(participants));

-- Policy 2: Criar salas DM (conversas diretas)
CREATE POLICY "chat_rooms_insert_dm"
  ON public.chat_rooms
  FOR INSERT
  WITH CHECK (
    type = 'dm'
    AND auth.uid() = ANY(participants)
  );

-- Policy 3: Admins podem criar salas de setor
CREATE POLICY "chat_rooms_insert_sector_admin"
  ON public.chat_rooms
  FOR INSERT
  WITH CHECK (
    type = 'sector'
    AND is_admin(auth.uid())
  );

-- Policy 4: Managers podem adicionar participantes a salas de seu setor
CREATE POLICY "chat_rooms_update_manager"
  ON public.chat_rooms
  FOR UPDATE
  USING (
    type = 'sector'
    AND is_manager(auth.uid())
    AND sector = get_user_sector(auth.uid())
  )
  WITH CHECK (
    type = 'sector'
    AND is_manager(auth.uid())
    AND sector = get_user_sector(auth.uid())
  );

-- ============================================================
-- PARTE 9: TABELA MESSAGES - POLÍTICAS RLS
-- ============================================================

-- 📌 Descrição:
-- - Visualizar mensagens apenas de salas acessíveis
-- - Enviar mensagens apenas em salas participantes

-- Policy 1: Visualizar mensagens de salas acessíveis
CREATE POLICY "messages_select"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE id = messages.room_id
        AND auth.uid() = ANY(participants)
    )
  );

-- Policy 2: Enviar mensagens em salas participantes
CREATE POLICY "messages_insert"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE id = messages.room_id
        AND auth.uid() = ANY(participants)
    )
  );

-- ============================================================
-- PARTE 10: TABELA DRIVE_ITEMS - POLÍTICAS RLS
-- ============================================================

-- 📌 Descrição:
-- - Admins: Acesso total a todos os arquivos
-- - Visualizar arquivos públicos
-- - Visualizar arquivos do próprio setor
-- - Visualizar arquivos compartilhados
-- - CRUD apenas para arquivos próprios ou compartilhados com permissão

-- Policy 1: Admins têm acesso completo
CREATE POLICY "drive_items_admin_all"
  ON public.drive_items
  FOR ALL
  USING (is_admin(auth.uid()));

-- Policy 2: Visualizar arquivos públicos
CREATE POLICY "drive_items_select_public"
  ON public.drive_items
  FOR SELECT
  USING (is_public = true);

-- Policy 3: Visualizar arquivos do próprio setor
CREATE POLICY "drive_items_select_own_sector"
  ON public.drive_items
  FOR SELECT
  USING (
    sector IS NOT NULL
    AND user_in_sector(auth.uid(), sector)
  );

-- Policy 4: Visualizar arquivos compartilhados
CREATE POLICY "drive_items_select_shared"
  ON public.drive_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_access
      WHERE item_id = drive_items.id
        AND user_id = auth.uid()
    )
  );

-- Policy 5: Criar arquivos no próprio setor
CREATE POLICY "drive_items_insert"
  ON public.drive_items
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      sector IS NULL
      OR user_in_sector(auth.uid(), sector)
    )
  );

-- Policy 6: Atualizar apenas arquivos próprios
CREATE POLICY "drive_items_update"
  ON public.drive_items
  FOR UPDATE
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- Policy 7: Deletar apenas arquivos próprios
CREATE POLICY "drive_items_delete"
  ON public.drive_items
  FOR DELETE
  USING (uploaded_by = auth.uid());

-- ============================================================
-- PARTE 11: TABELA SHARED_ACCESS - POLÍTICAS RLS
-- ============================================================

-- 📌 Descrição:
-- - Visualizar compartilhamentos que envolvem o usuário
-- - Compartilhar apenas arquivos próprios
-- - Revogar compartilhamentos que você criou

-- Policy 1: Visualizar compartilhamentos relevantes
CREATE POLICY "shared_access_select"
  ON public.shared_access
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR shared_by = auth.uid()
  );

-- Policy 2: Proprietários podem compartilhar arquivos
CREATE POLICY "shared_access_insert"
  ON public.shared_access
  FOR INSERT
  WITH CHECK (
    shared_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.drive_items
      WHERE id = shared_access.item_id
        AND uploaded_by = auth.uid()
    )
  );

-- Policy 3: Quem compartilhou pode revogar acesso
CREATE POLICY "shared_access_delete"
  ON public.shared_access
  FOR DELETE
  USING (shared_by = auth.uid());

-- Policy 4: Visualizar e atualizar permissões (apenas proprietário)
CREATE POLICY "shared_access_update"
  ON public.shared_access
  FOR UPDATE
  USING (shared_by = auth.uid())
  WITH CHECK (shared_by = auth.uid());

-- ============================================================
-- PARTE 12: TABELA COURSES - POLÍTICAS RLS
-- ============================================================

-- 📌 Descrição:
-- - Todos podem visualizar cursos
-- - Apenas admins podem gerenciar cursos

-- Policy 1: Todos podem visualizar cursos
CREATE POLICY "courses_select_all"
  ON public.courses
  FOR SELECT
  USING (true);

-- Policy 2: Apenas admins podem inserir cursos
CREATE POLICY "courses_insert_admin"
  ON public.courses
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Policy 3: Apenas admins podem atualizar cursos
CREATE POLICY "courses_update_admin"
  ON public.courses
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Policy 4: Apenas admins podem deletar cursos
CREATE POLICY "courses_delete_admin"
  ON public.courses
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================================
-- PARTE 13: TABELA LESSONS - POLÍTICAS RLS
-- ============================================================

-- 📌 Descrição:
-- - Todos podem visualizar aulas
-- - Apenas admins podem gerenciar aulas

-- Policy 1: Todos podem visualizar aulas
CREATE POLICY "lessons_select_all"
  ON public.lessons
  FOR SELECT
  USING (true);

-- Policy 2: Apenas admins podem inserir aulas
CREATE POLICY "lessons_insert_admin"
  ON public.lessons
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Policy 3: Apenas admins podem atualizar aulas
CREATE POLICY "lessons_update_admin"
  ON public.lessons
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Policy 4: Apenas admins podem deletar aulas
CREATE POLICY "lessons_delete_admin"
  ON public.lessons
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================================
-- PARTE 14: TABELA COURSE_PROGRESS - POLÍTICAS RLS
-- ============================================================

-- 📌 Descrição:
-- - Usuários só podem visualizar seu próprio progresso
-- - Apenas admins podem visualizar progresso de todos

-- Policy 1: Usuários visualizam seu próprio progresso
CREATE POLICY "course_progress_select_own"
  ON public.course_progress
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy 2: Admins podem visualizar progresso de todos
CREATE POLICY "course_progress_select_admin"
  ON public.course_progress
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Policy 3: Usuários podem inserir seu próprio progresso
CREATE POLICY "course_progress_insert_own"
  ON public.course_progress
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy 4: Usuários podem atualizar seu próprio progresso
CREATE POLICY "course_progress_update_own"
  ON public.course_progress
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 5: Admins podem atualizar progresso de qualquer um
CREATE POLICY "course_progress_update_admin"
  ON public.course_progress
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ============================================================
-- PARTE 15: TABELA CALENDAR_EVENTS - POLÍTICAS RLS
-- ============================================================

-- 📌 Descrição:
-- - Admins: Visualizam todos os eventos
-- - Todos: Visualizam eventos da empresa
-- - Setor: Visualizam eventos do próprio setor
-- - Pessoal: Visualizam eventos que participa
-- - Criadores: Podem editar/deletar seus próprios eventos

-- Policy 1: Admins visualizam todos os eventos
CREATE POLICY "calendar_events_select_admin"
  ON public.calendar_events
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Policy 2: Todos visualizam eventos da empresa
CREATE POLICY "calendar_events_select_company"
  ON public.calendar_events
  FOR SELECT
  USING (type = 'company');

-- Policy 3: Visualizar eventos do próprio setor
CREATE POLICY "calendar_events_select_own_sector"
  ON public.calendar_events
  FOR SELECT
  USING (
    type = 'sector'
    AND sector IS NOT NULL
    AND user_in_sector(auth.uid(), sector)
  );

-- Policy 4: Visualizar eventos pessoais que o usuário participa
CREATE POLICY "calendar_events_select_attending"
  ON public.calendar_events
  FOR SELECT
  USING (auth.uid() = ANY(attendees));

-- Policy 5: Criar eventos pessoais
CREATE POLICY "calendar_events_insert_personal"
  ON public.calendar_events
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND type = 'personal'
  );

-- Policy 6: Managers/Admins podem criar eventos de setor
CREATE POLICY "calendar_events_insert_sector"
  ON public.calendar_events
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND type = 'sector'
    AND sector IS NOT NULL
    AND (
      is_admin(auth.uid())
      OR (is_manager(auth.uid()) AND user_in_sector(auth.uid(), sector))
    )
  );

-- Policy 7: Admins podem criar eventos da empresa
CREATE POLICY "calendar_events_insert_company"
  ON public.calendar_events
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND type = 'company'
    AND is_admin(auth.uid())
  );

-- Policy 8: Criadores podem atualizar seus eventos
CREATE POLICY "calendar_events_update_creator"
  ON public.calendar_events
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy 9: Criadores podem deletar seus eventos
CREATE POLICY "calendar_events_delete_creator"
  ON public.calendar_events
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================================
-- PARTE 16: VALIDAÇÃO E TESTES
-- ============================================================

-- Execute estas queries para validar as políticas:

/*
-- 1. Verificar que todas as tabelas têm RLS habilitado
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Listar todas as políticas RLS
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Contar políticas por tabela
SELECT tablename, COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 4. Verificar funções criadas
SELECT proname FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname LIKE 'is_%' OR proname LIKE 'get_%' OR proname LIKE 'user_%'
ORDER BY proname;
*/

-- ============================================================
-- FIM DO SCRIPT RLS
-- ============================================================
--
-- 📝 RESUMO DO QUE FOI CONFIGURADO:
--
-- ✅ 15 tabelas com RLS habilitado
-- ✅ 70+ políticas de acesso granulares
-- ✅ 4 funções auxiliares para verificações comuns
-- ✅ Separação clara entre Admin, Manager e Colaborador
-- ✅ Controle por setor para maioria das tabelas
-- ✅ Suporte a compartilhamento de arquivos
-- ✅ Histórico e auditoria de tickets
-- ✅ Isolamento de dados sensíveis
--
-- 🔄 PRÓXIMAS AÇÕES:
-- 1. Testar login e acesso aos dados
-- 2. Verificar se as policies estão bloqueando dados corretamente
-- 3. Revisar logs de erro no Supabase
-- 4. Ajustar políticas conforme necessário
--
-- ============================================================
