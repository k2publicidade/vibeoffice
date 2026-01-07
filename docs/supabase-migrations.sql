-- ========================================
-- VIBEDISTRO - Supabase Database Schema
-- Execute este arquivo no Supabase SQL Editor
-- ========================================

-- ========================================
-- MIGRATION 1: ENUMS E EXTENSÕES
-- ========================================

-- Setores da empresa
CREATE TYPE sector_type AS ENUM (
  'A&R',
  'Marketing',
  'Financeiro',
  'Jurídico',
  'Administrativo',
  'TI/Suporte',
  'Atendimento ao Artista'
);

-- Roles de usuários
CREATE TYPE role_type AS ENUM (
  'Admin',
  'Gerente',
  'Colaborador'
);

-- Status de tarefas
CREATE TYPE task_status AS ENUM (
  'todo',
  'in_progress',
  'done'
);

-- Prioridades
CREATE TYPE priority_type AS ENUM (
  'low',
  'medium',
  'high'
);

-- Status de tickets
CREATE TYPE ticket_status AS ENUM (
  'open',
  'analyzing',
  'in_progress',
  'completed'
);

-- Tipo de sala de chat
CREATE TYPE room_type AS ENUM (
  'sector',
  'dm'
);

-- Tipo de mensagem
CREATE TYPE message_type AS ENUM (
  'text',
  'image',
  'file'
);

-- Tipo de item do drive
CREATE TYPE item_type AS ENUM (
  'file',
  'folder'
);

-- Permissões de compartilhamento
CREATE TYPE share_permission AS ENUM (
  'view',
  'edit',
  'manage'
);

-- Tipo de evento
CREATE TYPE event_type AS ENUM (
  'personal',
  'sector',
  'company'
);

-- UUID para geração de IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Busca full-text em português
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ========================================
-- MIGRATION 2: TABELA DE USUÁRIOS
-- ========================================

CREATE TABLE public.users (
  -- Usar mesmo UUID de auth.users
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT,
  sector sector_type NOT NULL,
  role role_type NOT NULL DEFAULT 'Colaborador',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_sector ON public.users(sector);
CREATE INDEX idx_users_role ON public.users(role);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all users"
  ON public.users
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Only admins can insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

CREATE POLICY "Only admins can delete users"
  ON public.users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Function: Criar user profile automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, sector, role, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'sector')::sector_type, 'Administrativo'),
    COALESCE((NEW.raw_user_meta_data->>'role')::role_type, 'Colaborador'),
    NEW.raw_user_meta_data->>'avatar'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Criar profile automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- MIGRATION 3: TABELA DE TAREFAS
-- ========================================

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority priority_type NOT NULL DEFAULT 'medium',

  due_date TIMESTAMPTZ,

  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sector sector_type NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  tags TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_sector ON public.tasks(sector);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);

-- Trigger para updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

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

-- ========================================
-- MIGRATION 4: TABELAS DE TICKETS
-- ========================================

CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  priority priority_type NOT NULL DEFAULT 'medium',

  requester UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_priority ON public.tickets(priority);
CREATE INDEX idx_tickets_requester ON public.tickets(requester);
CREATE INDEX idx_tickets_assigned_to ON public.tickets(assigned_to);

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ticket History
CREATE TABLE public.ticket_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,

  action TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  previous_value TEXT,
  new_value TEXT,

  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_history_ticket_id ON public.ticket_history(ticket_id);

-- Ticket Comments
CREATE TABLE public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,

  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  attachments TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  edited_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_ticket_comments_ticket_id ON public.ticket_comments(ticket_id);

CREATE TRIGGER update_ticket_comments_updated_at
  BEFORE UPDATE ON public.ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies - Tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and Managers can manage all tickets"
  ON public.tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('Admin', 'Gerente')
    )
  );

CREATE POLICY "Users can view own tickets"
  ON public.tickets
  FOR SELECT
  USING (requester = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Users can create tickets"
  ON public.tickets
  FOR INSERT
  WITH CHECK (requester = auth.uid());

-- RLS Policies - Ticket History
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history of accessible tickets"
  ON public.ticket_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE id = ticket_history.ticket_id
        AND (
          requester = auth.uid()
          OR assigned_to = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('Admin', 'Gerente')
          )
        )
    )
  );

CREATE POLICY "System can insert history"
  ON public.ticket_history
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies - Ticket Comments
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on accessible tickets"
  ON public.ticket_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE id = ticket_comments.ticket_id
        AND (
          requester = auth.uid()
          OR assigned_to = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('Admin', 'Gerente')
          )
        )
    )
    AND (
      NOT is_internal
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('Admin', 'Gerente')
      )
    )
  );

CREATE POLICY "Users can create comments on accessible tickets"
  ON public.ticket_comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tickets
      WHERE id = ticket_comments.ticket_id
        AND (requester = auth.uid() OR assigned_to = auth.uid())
    )
  );

-- Trigger: Auto-criar histórico ao alterar ticket
CREATE OR REPLACE FUNCTION public.log_ticket_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO public.ticket_history (ticket_id, action, changed_by, previous_value, new_value)
    VALUES (NEW.id, 'status_change', auth.uid(), OLD.status::TEXT, NEW.status::TEXT);
  END IF;

  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.ticket_history (ticket_id, action, changed_by, previous_value, new_value)
    VALUES (NEW.id, 'assigned_to_change', auth.uid(), OLD.assigned_to::TEXT, NEW.assigned_to::TEXT);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_ticket_update
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_ticket_change();

-- ========================================
-- MIGRATION 5: TABELAS DE CHAT
-- ========================================

CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name TEXT NOT NULL,
  type room_type NOT NULL,
  sector sector_type,

  participants UUID[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_rooms_type ON public.chat_rooms(type);
CREATE INDEX idx_chat_rooms_sector ON public.chat_rooms(sector);
CREATE INDEX idx_chat_rooms_participants ON public.chat_rooms USING GIN(participants);

CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  type message_type NOT NULL DEFAULT 'text',

  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_room_id ON public.messages(room_id);
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_messages_timestamp ON public.messages(timestamp DESC);

-- RLS Policies - Chat Rooms
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rooms they participate in"
  ON public.chat_rooms
  FOR SELECT
  USING (auth.uid() = ANY(participants));

CREATE POLICY "Users can create DM rooms"
  ON public.chat_rooms
  FOR INSERT
  WITH CHECK (
    type = 'dm'
    AND auth.uid() = ANY(participants)
  );

CREATE POLICY "Admins can create sector rooms"
  ON public.chat_rooms
  FOR INSERT
  WITH CHECK (
    type = 'sector'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- RLS Policies - Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from accessible rooms"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE id = messages.room_id
        AND auth.uid() = ANY(participants)
    )
  );

CREATE POLICY "Users can send messages in accessible rooms"
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

-- Trigger: Atualizar updated_at da sala ao enviar mensagem
CREATE OR REPLACE FUNCTION public.update_room_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_rooms
  SET updated_at = NOW()
  WHERE id = NEW.room_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_room_on_message();

-- Habilitar REALTIME para mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;

-- ========================================
-- MIGRATION 6: TABELAS DE DRIVE
-- ========================================

CREATE TABLE public.drive_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name TEXT NOT NULL,
  type item_type NOT NULL,
  parent_id UUID REFERENCES public.drive_items(id) ON DELETE CASCADE,

  sector sector_type,

  -- Apenas para arquivos
  size BIGINT,
  mime_type TEXT,
  storage_path TEXT, -- Caminho no Supabase Storage

  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drive_items_parent_id ON public.drive_items(parent_id);
CREATE INDEX idx_drive_items_sector ON public.drive_items(sector);
CREATE INDEX idx_drive_items_uploaded_by ON public.drive_items(uploaded_by);
CREATE INDEX idx_drive_items_type ON public.drive_items(type);

CREATE TRIGGER update_drive_items_updated_at
  BEFORE UPDATE ON public.drive_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Shared Access
CREATE TABLE public.shared_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  item_id UUID NOT NULL REFERENCES public.drive_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission share_permission NOT NULL DEFAULT 'view',

  shared_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(item_id, user_id)
);

CREATE INDEX idx_shared_access_item_id ON public.shared_access(item_id);
CREATE INDEX idx_shared_access_user_id ON public.shared_access(user_id);

-- RLS Policies - Drive Items
ALTER TABLE public.drive_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all drive items"
  ON public.drive_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

CREATE POLICY "Users can view public items"
  ON public.drive_items
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view own sector items"
  ON public.drive_items
  FOR SELECT
  USING (
    sector IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND users.sector = drive_items.sector
    )
  );

CREATE POLICY "Users can view shared items"
  ON public.drive_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_access
      WHERE item_id = drive_items.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create items in own sector"
  ON public.drive_items
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      sector IS NULL
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND users.sector = drive_items.sector
      )
    )
  );

CREATE POLICY "Users can manage own items"
  ON public.drive_items
  FOR UPDATE
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can delete own items"
  ON public.drive_items
  FOR DELETE
  USING (uploaded_by = auth.uid());

-- RLS Policies - Shared Access
ALTER TABLE public.shared_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant shares"
  ON public.shared_access
  FOR SELECT
  USING (user_id = auth.uid() OR shared_by = auth.uid());

CREATE POLICY "Owners can share items"
  ON public.shared_access
  FOR INSERT
  WITH CHECK (
    shared_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.drive_items
      WHERE id = shared_access.item_id AND uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Sharers can revoke access"
  ON public.shared_access
  FOR DELETE
  USING (shared_by = auth.uid());

-- ========================================
-- MIGRATION 7: TABELAS DE CURSOS
-- ========================================

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructor TEXT NOT NULL,
  thumbnail TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown
  video_url TEXT,
  "order" INTEGER NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX idx_lessons_order ON public.lessons("order");

CREATE TABLE public.course_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,

  completed_lessons UUID[] DEFAULT '{}',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  last_accessed_at TIMESTAMPTZ,

  UNIQUE(user_id, course_id)
);

CREATE INDEX idx_course_progress_user_id ON public.course_progress(user_id);
CREATE INDEX idx_course_progress_course_id ON public.course_progress(course_id);

-- RLS Policies - Courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view courses"
  ON public.courses
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage courses"
  ON public.courses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- RLS Policies - Lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view lessons"
  ON public.lessons
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage lessons"
  ON public.lessons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- RLS Policies - Course Progress
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.course_progress
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own progress"
  ON public.course_progress
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own progress"
  ON public.course_progress
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all progress"
  ON public.course_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- ========================================
-- MIGRATION 8: TABELA DE EVENTOS
-- ========================================

CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  title TEXT NOT NULL,
  description TEXT,

  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,

  type event_type NOT NULL,
  sector sector_type,
  location TEXT,

  attendees UUID[] DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (end_time > start_time)
);

CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_events_type ON public.calendar_events(type);
CREATE INDEX idx_calendar_events_sector ON public.calendar_events(sector);
CREATE INDEX idx_calendar_events_attendees ON public.calendar_events USING GIN(attendees);

-- RLS Policies
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all events"
  ON public.calendar_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

CREATE POLICY "Users can view company events"
  ON public.calendar_events
  FOR SELECT
  USING (type = 'company');

CREATE POLICY "Users can view own sector events"
  ON public.calendar_events
  FOR SELECT
  USING (
    type = 'sector'
    AND sector IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND users.sector = calendar_events.sector
    )
  );

CREATE POLICY "Users can view events they attend"
  ON public.calendar_events
  FOR SELECT
  USING (auth.uid() = ANY(attendees));

CREATE POLICY "Users can create events"
  ON public.calendar_events
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      type = 'personal'
      OR (type = 'sector' AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND users.sector = calendar_events.sector
      ))
      OR (type = 'company' AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('Admin', 'Gerente')
      ))
    )
  );

CREATE POLICY "Creators can manage their events"
  ON public.calendar_events
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creators can delete their events"
  ON public.calendar_events
  FOR DELETE
  USING (created_by = auth.uid());

-- =====================================================
-- Migration 012: Grupos de Projeto no Chat
-- =====================================================
-- Data: 2026-01-07
-- Descrição: Adiciona suporte a grupos personalizados de projeto

-- Adicionar novo tipo ao enum room_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'project'
    AND enumtypid = 'room_type'::regtype
  ) THEN
    ALTER TYPE room_type ADD VALUE 'project';
  END IF;
END $$;

-- Adicionar campos para grupos de projeto
ALTER TABLE chat_rooms
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Comentários para documentação
COMMENT ON COLUMN chat_rooms.description IS 'Descrição/objetivo do grupo de projeto (apenas para type=project)';
COMMENT ON COLUMN chat_rooms.created_by IS 'UUID do criador do grupo (apenas para type=project)';

-- Índice para performance em queries por criador
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by
  ON chat_rooms(created_by)
  WHERE created_by IS NOT NULL;

-- =====================================================
-- RLS Policies para Grupos de Projeto
-- =====================================================

-- Permitir usuários criarem grupos de projeto
CREATE POLICY "Users can create project groups"
  ON chat_rooms FOR INSERT
  WITH CHECK (
    type = 'project'
    AND created_by = auth.uid()
  );

-- Apenas criador pode deletar grupo de projeto
CREATE POLICY "Creator can delete project groups"
  ON chat_rooms FOR DELETE
  USING (
    type = 'project'
    AND created_by IS NOT NULL
    AND created_by = auth.uid()
  );

-- Apenas criador pode atualizar grupo de projeto
CREATE POLICY "Creator can update project groups"
  ON chat_rooms FOR UPDATE
  USING (type = 'project' AND created_by IS NOT NULL AND created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Permitir usuários verem grupos de projeto onde são participantes
-- (isso já é coberto pela policy existente de SELECT em chat_rooms,
-- mas vamos garantir que funciona para type='project' também)
DROP POLICY IF EXISTS "Users can view their chat rooms" ON chat_rooms;
CREATE POLICY "Users can view their chat rooms"
  ON chat_rooms FOR SELECT
  USING (auth.uid() = ANY(participants));
