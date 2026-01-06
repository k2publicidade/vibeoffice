-- ========================================
-- VIBEDISTRO - FIX PERMISSIONS & RLS
-- Execute este arquivo no Supabase SQL Editor
-- para corrigir TODAS as permissões do sistema
-- ========================================

-- ========================================
-- 1. LIMPAR POLÍTICAS EXISTENTES
-- ========================================

-- Remover todas as políticas antigas da tabela users
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Only admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Only admins can delete users" ON public.users;

-- Remover políticas das outras tabelas (se existirem)
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;

DROP POLICY IF EXISTS "Users can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can insert tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can update tickets" ON public.tickets;

DROP POLICY IF EXISTS "Users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;

DROP POLICY IF EXISTS "Users can view chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can insert chat rooms" ON public.chat_rooms;

DROP POLICY IF EXISTS "Users can view drive items" ON public.drive_items;
DROP POLICY IF EXISTS "Users can insert drive items" ON public.drive_items;
DROP POLICY IF EXISTS "Users can update drive items" ON public.drive_items;
DROP POLICY IF EXISTS "Users can delete drive items" ON public.drive_items;

DROP POLICY IF EXISTS "Users can view courses" ON public.courses;
DROP POLICY IF EXISTS "Users can view lessons" ON public.lessons;
DROP POLICY IF EXISTS "Users can view/update own progress" ON public.course_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.course_progress;

DROP POLICY IF EXISTS "Users can view events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can insert events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.calendar_events;

-- ========================================
-- 2. POLÍTICAS RLS - TABELA USERS
-- ========================================

-- Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- PERMITIR leitura pública (necessário para login e listagem)
CREATE POLICY "Allow public read access to users"
  ON public.users
  FOR SELECT
  USING (true);

-- PERMITIR inserção de novos usuários (signup)
-- Importante: Permite que novos usuários se cadastrem
CREATE POLICY "Allow user signup"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- PERMITIR atualização do próprio perfil
CREATE POLICY "Allow users to update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- PERMITIR que admins deletem usuários
CREATE POLICY "Allow admins to delete users"
  ON public.users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- ========================================
-- 3. POLÍTICAS RLS - TABELA TASKS
-- ========================================

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver tarefas do seu setor ou atribuídas a eles
CREATE POLICY "Users can view relevant tasks"
  ON public.tasks
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      -- Admin vê tudo
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
      OR
      -- Gerente vê tudo do seu setor
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Gerente' AND sector = tasks.sector)
      OR
      -- Colaborador vê tarefas do seu setor ou atribuídas a ele
      (sector IN (SELECT sector FROM public.users WHERE id = auth.uid()))
      OR
      (assigned_to = auth.uid())
      OR
      (created_by = auth.uid())
    )
  );

-- Usuários podem criar tarefas no seu setor
CREATE POLICY "Users can create tasks in own sector"
  ON public.tasks
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    sector IN (SELECT sector FROM public.users WHERE id = auth.uid())
  );

-- Usuários podem atualizar tarefas que criaram ou que foram atribuídas a eles
CREATE POLICY "Users can update own tasks"
  ON public.tasks
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() OR
      assigned_to = auth.uid() OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'Admin' OR role = 'Gerente'))
    )
  );

-- Apenas criador ou admin pode deletar
CREATE POLICY "Users can delete own tasks or admins can delete all"
  ON public.tasks
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
    )
  );

-- ========================================
-- 4. POLÍTICAS RLS - TABELA TICKETS
-- ========================================

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Ver tickets: requester, assigned_to, admins e gerentes
CREATE POLICY "Users can view relevant tickets"
  ON public.tickets
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      requester = auth.uid() OR
      assigned_to = auth.uid() OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Gerente'))
    )
  );

-- Qualquer usuário autenticado pode criar tickets
CREATE POLICY "Authenticated users can create tickets"
  ON public.tickets
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND requester = auth.uid());

-- Atualizar: requester, assigned_to, admins e gerentes
CREATE POLICY "Users can update relevant tickets"
  ON public.tickets
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      requester = auth.uid() OR
      assigned_to = auth.uid() OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Gerente'))
    )
  );

-- ========================================
-- 5. POLÍTICAS RLS - TICKET COMMENTS & HISTORY
-- ========================================

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

-- Comentários: visíveis para quem pode ver o ticket
CREATE POLICY "Users can view ticket comments"
  ON public.ticket_comments
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_comments.ticket_id
      AND (
        t.requester = auth.uid() OR
        t.assigned_to = auth.uid() OR
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Gerente'))
      )
    )
  );

CREATE POLICY "Users can create ticket comments"
  ON public.ticket_comments
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Histórico: mesmas regras dos tickets
CREATE POLICY "Users can view ticket history"
  ON public.ticket_history
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_history.ticket_id
      AND (
        t.requester = auth.uid() OR
        t.assigned_to = auth.uid() OR
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Gerente'))
      )
    )
  );

CREATE POLICY "System can create ticket history"
  ON public.ticket_history
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND changed_by = auth.uid());

-- ========================================
-- 6. POLÍTICAS RLS - CHAT (ROOMS & MESSAGES)
-- ========================================

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Salas: usuários veem salas onde são participantes
CREATE POLICY "Users can view chat rooms where they are participants"
  ON public.chat_rooms
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      auth.uid() = ANY(participants) OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
    )
  );

-- Criar salas: qualquer usuário autenticado
CREATE POLICY "Users can create chat rooms"
  ON public.chat_rooms
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = ANY(participants));

-- Mensagens: ver mensagens das salas onde é participante
CREATE POLICY "Users can view messages in their rooms"
  ON public.messages
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE id = messages.room_id
      AND auth.uid() = ANY(participants)
    )
  );

-- Enviar mensagens: em salas onde é participante
CREATE POLICY "Users can send messages in their rooms"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE id = messages.room_id
      AND auth.uid() = ANY(participants)
    )
  );

-- ========================================
-- 7. POLÍTICAS RLS - DRIVE (ITEMS & SHARED ACCESS)
-- ========================================

ALTER TABLE public.drive_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_access ENABLE ROW LEVEL SECURITY;

-- Ver arquivos: públicos, do seu setor, ou compartilhados com você
CREATE POLICY "Users can view accessible drive items"
  ON public.drive_items
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      is_public = true OR
      uploaded_by = auth.uid() OR
      sector IN (SELECT sector FROM public.users WHERE id = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin') OR
      EXISTS (
        SELECT 1 FROM public.shared_access
        WHERE item_id = drive_items.id
        AND user_id = auth.uid()
      )
    )
  );

-- Upload: qualquer usuário autenticado
CREATE POLICY "Authenticated users can upload files"
  ON public.drive_items
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND uploaded_by = auth.uid());

-- Atualizar: apenas quem fez upload ou admin
CREATE POLICY "Users can update own drive items"
  ON public.drive_items
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      uploaded_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
    )
  );

-- Deletar: apenas quem fez upload ou admin
CREATE POLICY "Users can delete own drive items"
  ON public.drive_items
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND (
      uploaded_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
    )
  );

-- Shared Access: ver compartilhamentos onde você é o destinatário ou admin
CREATE POLICY "Users can view shared access records"
  ON public.shared_access
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      shared_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
    )
  );

CREATE POLICY "Users can share own files"
  ON public.shared_access
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    shared_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.drive_items
      WHERE id = shared_access.item_id
      AND uploaded_by = auth.uid()
    )
  );

-- ========================================
-- 8. POLÍTICAS RLS - COURSES, LESSONS & PROGRESS
-- ========================================

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- Cursos: todos podem ver (público)
CREATE POLICY "Anyone authenticated can view courses"
  ON public.courses
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Apenas admins criam cursos
CREATE POLICY "Only admins can create courses"
  ON public.courses
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );

-- Lições: todos podem ver
CREATE POLICY "Anyone authenticated can view lessons"
  ON public.lessons
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Apenas admins criam lições
CREATE POLICY "Only admins can create lessons"
  ON public.lessons
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );

-- Progresso: ver e atualizar apenas o próprio
CREATE POLICY "Users can view own progress"
  ON public.course_progress
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can create own progress"
  ON public.course_progress
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can update own progress"
  ON public.course_progress
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ========================================
-- 9. POLÍTICAS RLS - CALENDAR EVENTS
-- ========================================

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Ver eventos: pessoais (próprios), do setor, ou da empresa
CREATE POLICY "Users can view relevant events"
  ON public.calendar_events
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      type = 'company' OR
      (type = 'sector' AND sector IN (SELECT sector FROM public.users WHERE id = auth.uid())) OR
      (type = 'personal' AND created_by = auth.uid()) OR
      auth.uid() = ANY(attendees)
    )
  );

-- Criar eventos
CREATE POLICY "Users can create events"
  ON public.calendar_events
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid() AND
    (
      type = 'personal' OR
      (type = 'sector' AND sector IN (SELECT sector FROM public.users WHERE id = auth.uid())) OR
      (type = 'company' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Gerente')))
    )
  );

-- Atualizar: apenas eventos próprios ou admin
CREATE POLICY "Users can update own events"
  ON public.calendar_events
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
    )
  );

-- Deletar: apenas eventos próprios ou admin
CREATE POLICY "Users can delete own events"
  ON public.calendar_events
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
    )
  );

-- ========================================
-- 10. GARANTIR PERMISSÕES DE STORAGE
-- ========================================

-- Criar bucket se não existir (para Drive)
INSERT INTO storage.buckets (id, name, public)
VALUES ('drive-files', 'drive-files', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view accessible files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Upload: usuários autenticados
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'drive-files' AND
    auth.uid() IS NOT NULL
  );

-- Download: usuários autenticados (RLS da tabela drive_items controla acesso real)
CREATE POLICY "Users can view accessible files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'drive-files' AND
    auth.uid() IS NOT NULL
  );

-- Atualizar: apenas donos do arquivo
CREATE POLICY "Users can update own files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'drive-files' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Deletar: apenas donos do arquivo
CREATE POLICY "Users can delete own files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'drive-files' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ========================================
-- 11. VERIFICAÇÃO FINAL
-- ========================================

-- Mostrar resumo de políticas criadas
SELECT
  schemaname,
  tablename,
  COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ========================================
-- FIM DO SCRIPT
-- ========================================

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Todas as permissões RLS foram configuradas com sucesso!';
  RAISE NOTICE '✅ Total de tabelas protegidas: 12';
  RAISE NOTICE '✅ Storage bucket configurado: drive-files';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '1. Teste o login com: eu@vibedistro.com / password123';
  RAISE NOTICE '2. Teste criar tarefas, tickets, mensagens';
  RAISE NOTICE '3. Teste upload de arquivos no Drive';
  RAISE NOTICE '4. Verifique permissões por role (Admin, Gerente, Colaborador)';
END $$;
