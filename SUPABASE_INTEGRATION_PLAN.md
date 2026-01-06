# Plano de Integração Supabase - VIBEDISTRO Intranet

## Visão Geral

Este plano detalha a migração completa do sistema VIBEDISTRO de dados 100% mockados para **Supabase** como backend de produção, incluindo:
- ✅ Database PostgreSQL com RLS (Row Level Security)
- ✅ Supabase Auth para autenticação real
- ✅ Supabase Storage para arquivos do Drive
- ✅ Supabase Realtime para chat ao vivo
- ✅ Migration path gradual com feature flags

**Credenciais do Projeto:**
- **Project URL:** https://tuwqhdayuefuchotrspq.supabase.co
- **Publishable Key:** sb_publishable_1qYAr2vDQo8QIziNR7PtDQ_dsTslvss
- **Database Password:** Frajola@212

---

## Fase 1: Configuração Inicial do Supabase

### Task 1.1: Instalar Dependências do Supabase

**Arquivos:** `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\package.json`

**Passos:**
```bash
# Instalar cliente Supabase
npm install @supabase/supabase-js @supabase/ssr

# Instalar CLI do Supabase (opcional, para migrations locais)
npm install -D supabase
```

**Commit:**
```bash
git add package.json package-lock.json
git commit -m "feat: add Supabase dependencies"
```

---

### Task 1.2: Configurar Variáveis de Ambiente

**Arquivos:**
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\.env.local`
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\.env.example`

**Passos:**

1. **Atualizar `.env.example`:**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tuwqhdayuefuchotrspq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_1qYAr2vDQo8QIziNR7PtDQ_dsTslvss
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui

# NextAuth.js (mantém compatibilidade)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
AUTH_TRUST_HOST=true

# Feature Flags
NEXT_PUBLIC_USE_MOCK_DATA=true
NEXT_PUBLIC_USE_SUPABASE_AUTH=false
NEXT_PUBLIC_USE_SUPABASE_REALTIME=false
```

2. **Copiar para `.env.local` e preencher Service Role Key real (obtida no Supabase Dashboard)**

**Commit:**
```bash
git add .env.example
git commit -m "chore: add Supabase environment variables"
```

---

### Task 1.3: Criar Cliente Supabase

**Arquivos:** `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\lib\supabase\client.ts` (novo)

**Passos:**

1. **Criar diretório:** `src/lib/supabase`

2. **Criar `src/lib/supabase/client.ts`:**
```typescript
/**
 * Supabase Client Configuration
 * Browser client para uso em Client Components
 */

import { createBrowserClient } from '@supabase/ssr'
import { Database } from './database.types'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// Cliente singleton para uso direto
export const supabase = createClient()
```

3. **Criar `src/lib/supabase/server.ts`:**
```typescript
/**
 * Supabase Server Client
 * Para uso em Server Components e API Routes
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './database.types'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Cookies podem não ser setáveis em Server Components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Cookies podem não ser removíveis em Server Components
          }
        },
      },
    }
  )
}
```

4. **Criar `src/lib/supabase/database.types.ts` (placeholder):**
```typescript
/**
 * Supabase Database TypeScript Types
 * Será gerado automaticamente após criar schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // Será preenchido após migrations
    }
    Views: {
      // Será preenchido se necessário
    }
    Functions: {
      // Será preenchido se necessário
    }
    Enums: {
      // Será preenchido após migrations
    }
  }
}
```

**Commit:**
```bash
git add src/lib/supabase/
git commit -m "feat: create Supabase client configuration"
```

---

## Fase 2: Database Schema Design & Migration

### Task 2.1: Criar Enums e Extensões

**Arquivos:** Supabase SQL Editor (copiar query abaixo)

**Passos:**

1. **Abrir Supabase Dashboard → SQL Editor**

2. **Executar SQL:**
```sql
-- ========================================
-- ENUMS - Tipos enumerados do sistema
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

-- ========================================
-- EXTENSÕES
-- ========================================

-- UUID para geração de IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Busca full-text em português
CREATE EXTENSION IF NOT EXISTS "unaccent";
```

**Documentar:** Migration executada manualmente via SQL Editor

---

### Task 2.2: Criar Tabela de Usuários (users)

**Arquivos:** Supabase SQL Editor

**Passos:**

1. **Executar SQL:**
```sql
-- ========================================
-- TABELA: users
-- Usuários do sistema (sincronizado com auth.users)
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

-- Index para busca por email e setor
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

-- ========================================
-- RLS (Row Level Security)
-- ========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ler todos os outros usuários (para menções, atribuições, etc)
CREATE POLICY "Users can view all users"
  ON public.users
  FOR SELECT
  USING (true);

-- Política: Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política: Apenas admins podem criar/deletar usuários
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

-- ========================================
-- FUNCTION: Criar user profile automaticamente após signup
-- ========================================

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
```

**Documentar:** Migration `001_create_users_table.sql` executada

---

### Task 2.3: Criar Tabela de Tarefas (tasks)

**Arquivos:** Supabase SQL Editor

**Passos:**

1. **Executar SQL:**
```sql
-- ========================================
-- TABELA: tasks
-- Sistema de tarefas Kanban
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

-- ========================================
-- RLS Policies
-- ========================================

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Admins: acesso total
CREATE POLICY "Admins have full access to tasks"
  ON public.tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Gerentes: acesso total ao próprio setor + leitura em outros
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

-- Colaboradores: podem ver tarefas do próprio setor e gerenciar aquelas atribuídas a eles
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

-- Qualquer usuário pode criar tarefas no próprio setor
CREATE POLICY "Users can create tasks in own sector"
  ON public.tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND sector = tasks.sector
    )
  );
```

**Documentar:** Migration `002_create_tasks_table.sql` executada

---

### Task 2.4: Criar Tabela de Tickets (tickets, ticket_history, ticket_comments)

**Arquivos:** Supabase SQL Editor

**Passos:**

1. **Executar SQL:**
```sql
-- ========================================
-- TABELA: tickets
-- Sistema de solicitações/suporte interno
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

-- ========================================
-- TABELA: ticket_history
-- Histórico de mudanças em tickets
-- ========================================

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

-- ========================================
-- TABELA: ticket_comments
-- Comentários em tickets
-- ========================================

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

-- ========================================
-- RLS Policies - Tickets
-- ========================================

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Admins e Gerentes têm acesso total
CREATE POLICY "Admins and Managers can manage all tickets"
  ON public.tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('Admin', 'Gerente')
    )
  );

-- Usuários podem ver tickets que criaram ou foram atribuídos a eles
CREATE POLICY "Users can view own tickets"
  ON public.tickets
  FOR SELECT
  USING (requester = auth.uid() OR assigned_to = auth.uid());

-- Usuários podem criar tickets
CREATE POLICY "Users can create tickets"
  ON public.tickets
  FOR INSERT
  WITH CHECK (requester = auth.uid());

-- ========================================
-- RLS Policies - Ticket History
-- ========================================

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

-- Apenas sistema pode inserir (via triggers)
CREATE POLICY "System can insert history"
  ON public.ticket_history
  FOR INSERT
  WITH CHECK (true);

-- ========================================
-- RLS Policies - Ticket Comments
-- ========================================

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

-- ========================================
-- TRIGGER: Auto-criar histórico ao alterar ticket
-- ========================================

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
```

**Documentar:** Migration `003_create_tickets_tables.sql` executada

---

### Task 2.5: Criar Tabelas de Chat (chat_rooms, messages)

**Arquivos:** Supabase SQL Editor

**Passos:**

1. **Executar SQL:**
```sql
-- ========================================
-- TABELA: chat_rooms
-- Salas de chat (setores + DMs)
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

-- ========================================
-- TABELA: messages
-- Mensagens de chat (com suporte a Realtime)
-- ========================================

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

-- ========================================
-- RLS Policies - Chat Rooms
-- ========================================

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver salas onde são participantes
CREATE POLICY "Users can view rooms they participate in"
  ON public.chat_rooms
  FOR SELECT
  USING (auth.uid() = ANY(participants));

-- Usuários podem criar DMs
CREATE POLICY "Users can create DM rooms"
  ON public.chat_rooms
  FOR INSERT
  WITH CHECK (
    type = 'dm'
    AND auth.uid() = ANY(participants)
  );

-- Apenas admins podem criar salas de setor
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

-- ========================================
-- RLS Policies - Messages
-- ========================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver mensagens de salas que participam
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

-- Usuários podem enviar mensagens em salas que participam
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

-- ========================================
-- TRIGGER: Atualizar updated_at da sala ao enviar mensagem
-- ========================================

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

-- ========================================
-- HABILITAR REALTIME para mensagens
-- ========================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
```

**Documentar:** Migration `004_create_chat_tables.sql` executada

---

### Task 2.6: Criar Tabelas de Drive (drive_items, shared_access)

**Arquivos:** Supabase SQL Editor

**Passos:**

1. **Executar SQL:**
```sql
-- ========================================
-- TABELA: drive_items
-- Arquivos e pastas do Drive
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

-- ========================================
-- TABELA: shared_access
-- Compartilhamentos de itens do Drive
-- ========================================

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

-- ========================================
-- RLS Policies - Drive Items
-- ========================================

ALTER TABLE public.drive_items ENABLE ROW LEVEL SECURITY;

-- Admins têm acesso total
CREATE POLICY "Admins can manage all drive items"
  ON public.drive_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Usuários podem ver itens públicos
CREATE POLICY "Users can view public items"
  ON public.drive_items
  FOR SELECT
  USING (is_public = true);

-- Usuários podem ver itens do próprio setor
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

-- Usuários podem ver itens que foram compartilhados com eles
CREATE POLICY "Users can view shared items"
  ON public.drive_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_access
      WHERE item_id = drive_items.id AND user_id = auth.uid()
    )
  );

-- Usuários podem criar itens no próprio setor
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

-- Usuários podem atualizar/deletar itens que criaram
CREATE POLICY "Users can manage own items"
  ON public.drive_items
  FOR UPDATE
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can delete own items"
  ON public.drive_items
  FOR DELETE
  USING (uploaded_by = auth.uid());

-- ========================================
-- RLS Policies - Shared Access
-- ========================================

ALTER TABLE public.shared_access ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver compartilhamentos onde estão envolvidos
CREATE POLICY "Users can view relevant shares"
  ON public.shared_access
  FOR SELECT
  USING (user_id = auth.uid() OR shared_by = auth.uid());

-- Apenas donos de itens podem compartilhar
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

-- Apenas quem compartilhou pode revogar
CREATE POLICY "Sharers can revoke access"
  ON public.shared_access
  FOR DELETE
  USING (shared_by = auth.uid());
```

**Documentar:** Migration `005_create_drive_tables.sql` executada

---

### Task 2.7: Criar Tabelas de Cursos (courses, lessons, course_progress)

**Arquivos:** Supabase SQL Editor

**Passos:**

1. **Executar SQL:**
```sql
-- ========================================
-- TABELA: courses
-- Catálogo de cursos internos
-- ========================================

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructor TEXT NOT NULL,
  thumbnail TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- TABELA: lessons
-- Aulas dos cursos
-- ========================================

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

-- ========================================
-- TABELA: course_progress
-- Progresso de usuários em cursos
-- ========================================

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

-- ========================================
-- RLS Policies - Courses
-- ========================================

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Todos podem ver cursos
CREATE POLICY "All users can view courses"
  ON public.courses
  FOR SELECT
  USING (true);

-- Apenas admins podem criar/editar cursos
CREATE POLICY "Admins can manage courses"
  ON public.courses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- ========================================
-- RLS Policies - Lessons
-- ========================================

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Todos podem ver aulas
CREATE POLICY "All users can view lessons"
  ON public.lessons
  FOR SELECT
  USING (true);

-- Apenas admins podem gerenciar aulas
CREATE POLICY "Admins can manage lessons"
  ON public.lessons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- ========================================
-- RLS Policies - Course Progress
-- ========================================

ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seu próprio progresso
CREATE POLICY "Users can view own progress"
  ON public.course_progress
  FOR SELECT
  USING (user_id = auth.uid());

-- Usuários podem criar/atualizar seu próprio progresso
CREATE POLICY "Users can manage own progress"
  ON public.course_progress
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own progress"
  ON public.course_progress
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins podem ver progresso de todos
CREATE POLICY "Admins can view all progress"
  ON public.course_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );
```

**Documentar:** Migration `006_create_courses_tables.sql` executada

---

### Task 2.8: Criar Tabela de Eventos (calendar_events)

**Arquivos:** Supabase SQL Editor

**Passos:**

1. **Executar SQL:**
```sql
-- ========================================
-- TABELA: calendar_events
-- Eventos da agenda
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

-- ========================================
-- RLS Policies
-- ========================================

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os eventos
CREATE POLICY "Admins can view all events"
  ON public.calendar_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Usuários podem ver eventos da empresa
CREATE POLICY "Users can view company events"
  ON public.calendar_events
  FOR SELECT
  USING (type = 'company');

-- Usuários podem ver eventos do próprio setor
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

-- Usuários podem ver eventos pessoais onde são participantes
CREATE POLICY "Users can view events they attend"
  ON public.calendar_events
  FOR SELECT
  USING (auth.uid() = ANY(attendees));

-- Usuários podem criar eventos
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

-- Criadores podem editar/deletar eventos
CREATE POLICY "Creators can manage their events"
  ON public.calendar_events
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creators can delete their events"
  ON public.calendar_events
  FOR DELETE
  USING (created_by = auth.uid());
```

**Documentar:** Migration `007_create_calendar_events_table.sql` executada

---

### Task 2.9: Gerar TypeScript Types Automaticamente

**Arquivos:**
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\lib\supabase\database.types.ts`

**Passos:**

1. **Obter Service Role Key do Supabase Dashboard** (Settings → API → service_role secret)

2. **Executar comando:**
```bash
# Instalar CLI do Supabase globalmente (se não tiver)
npx supabase login

# Gerar types
npx supabase gen types typescript --project-id tuwqhdayuefuchotrspq > src/lib/supabase/database.types.ts
```

3. **Verificar arquivo gerado** - deve conter todas as tabelas e enums

**Commit:**
```bash
git add src/lib/supabase/database.types.ts
git commit -m "feat: generate Supabase TypeScript types"
```

---

## Fase 3: Configurar Supabase Storage para Drive

### Task 3.1: Criar Buckets de Storage

**Arquivos:** Supabase Dashboard → Storage

**Passos:**

1. **Criar bucket `drive-files` (privado):**
   - Nome: `drive-files`
   - Público: ❌ (privado)
   - Allowed MIME types: `*/*` (todos)
   - Max file size: `50MB`

2. **Configurar RLS Policies no bucket via SQL Editor:**
```sql
-- ========================================
-- STORAGE POLICIES - Bucket: drive-files
-- ========================================

-- Usuários podem fazer upload no próprio setor
CREATE POLICY "Users can upload to own sector"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'drive-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Usuários podem acessar arquivos do próprio setor
CREATE POLICY "Users can access own sector files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'drive-files'
  AND (
    -- Arquivos públicos
    (storage.foldername(name))[2] = 'public'
    OR
    -- Arquivos do próprio setor
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND users.sector::text = (storage.foldername(name))[2]
    )
    OR
    -- Admins têm acesso total
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  )
);

-- Usuários podem deletar próprios arquivos
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'drive-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Documentar:** Bucket `drive-files` criado com policies configuradas

---

### Task 3.2: Criar Helper para Upload de Arquivos

**Arquivos:** `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\lib\supabase\storage.ts` (novo)

**Passos:**

1. **Criar `src/lib/supabase/storage.ts`:**
```typescript
/**
 * Supabase Storage Helpers
 * Funções para gerenciar uploads/downloads de arquivos
 */

import { supabase } from './client'

export interface UploadFileOptions {
  file: File
  bucket: string
  path: string
  onProgress?: (progress: number) => void
}

export interface UploadResult {
  path: string
  url: string
  size: number
  mimeType: string
}

/**
 * Upload de arquivo com progresso
 */
export async function uploadFile({
  file,
  bucket,
  path,
  onProgress,
}: UploadFileOptions): Promise<UploadResult> {
  // Upload do arquivo
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  // Obter URL pública/signed
  const { data: urlData } = await supabase.storage
    .from(bucket)
    .createSignedUrl(data.path, 60 * 60 * 24 * 7) // 7 dias

  if (!urlData) {
    throw new Error('Failed to get file URL')
  }

  return {
    path: data.path,
    url: urlData.signedUrl,
    size: file.size,
    mimeType: file.type,
  }
}

/**
 * Obter URL assinada de arquivo
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) {
    throw new Error(`Failed to get signed URL: ${error.message}`)
  }

  return data.signedUrl
}

/**
 * Deletar arquivo
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path])

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}

/**
 * Listar arquivos em um diretório
 */
export async function listFiles(bucket: string, path: string = '') {
  const { data, error } = await supabase.storage.from(bucket).list(path)

  if (error) {
    throw new Error(`Failed to list files: ${error.message}`)
  }

  return data
}
```

**Commit:**
```bash
git add src/lib/supabase/storage.ts
git commit -m "feat: add Supabase Storage helpers"
```

---

## Fase 4: Migrar Autenticação para Supabase Auth

### Task 4.1: Criar Seed de Usuários Mockados

**Arquivos:** Supabase SQL Editor

**Passos:**

1. **Executar SQL para criar usuários mockados:**
```sql
-- ========================================
-- SEED: Criar usuários mockados iniciais
-- ========================================

-- IMPORTANTE: Executar apenas uma vez em desenvolvimento
-- Supabase Auth criará automaticamente os profiles via trigger

-- 1. Usuário Admin (Você)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'eu@vibedistro.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  jsonb_build_object(
    'name', 'Você',
    'sector', 'Administrativo',
    'role', 'Admin',
    'avatar', 'https://ui-avatars.com/api/?name=Você&background=ff0300&color=fff&size=128'
  ),
  NOW(),
  NOW()
);

-- 2-20. Criar demais usuários mockados (A&R, Marketing, etc)
-- Use script similar para todos os mockUsers

-- Exemplo: João Silva (A&R - Admin)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'joao.silva@vibedistro.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  jsonb_build_object(
    'name', 'João Silva',
    'sector', 'A&R',
    'role', 'Admin',
    'avatar', 'https://ui-avatars.com/api/?name=João+Silva&background=ff0300&color=fff&size=128'
  ),
  NOW(),
  NOW()
);

-- ... Repetir para os outros 18 usuários mockados
```

2. **Verificar se profiles foram criados automaticamente:**
```sql
SELECT id, email, name, sector, role FROM public.users;
```

**Documentar:** Seed `seed_mock_users.sql` executado

---

### Task 4.2: Atualizar Auth para usar Supabase Auth

**Arquivos:** `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\lib\auth.ts`

**Passos:**

1. **Substituir completamente `src/lib/auth.ts`:**
```typescript
/**
 * Authentication Configuration - Supabase Auth
 * Migrado de NextAuth.js para Supabase Auth nativo
 */

import { createServerSupabaseClient } from './supabase/server'
import { User } from '@/types/auth'

export interface Session {
  user: User
  accessToken: string
  expiresAt: number
}

/**
 * Obter sessão atual do servidor
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await createServerSupabaseClient()

  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    return null
  }

  // Buscar dados completos do usuário
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (userError || !userData) {
    return null
  }

  return {
    user: {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      avatar: userData.avatar,
      sector: userData.sector,
      role: userData.role,
      createdAt: new Date(userData.created_at),
      updatedAt: new Date(userData.updated_at),
    },
    accessToken: session.access_token,
    expiresAt: new Date(session.expires_at!).getTime(),
  }
}

/**
 * Login com email e senha
 */
export async function signIn(email: string, password: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Logout
 */
export async function signOut() {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Verificar se usuário está autenticado
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return session !== null
}
```

2. **Atualizar middleware:**
```typescript
// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session
  const { data: { session } } = await supabase.auth.getSession()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  const isProtectedRoute = !isAuthRoute

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Commit:**
```bash
git add src/lib/auth.ts src/middleware.ts
git commit -m "feat: migrate auth to Supabase Auth"
```

---

### Task 4.3: Atualizar Hook useAuth

**Arquivos:** `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\hooks\useAuth.ts`

**Passos:**

1. **Substituir completamente:**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { User } from '@/types/auth'
import { useRouter } from 'next/navigation'

export interface UseAuthReturn {
  user: User | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setIsLoading(false)
      }
    })

    // Escutar mudanças de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setUser(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        avatar: data.avatar,
        sector: data.sector,
        role: data.role,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      })
    }
    setIsLoading(false)
  }

  async function signIn(email: string, password: string) {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push('/')
    } catch (error: any) {
      throw new Error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function signOut() {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    user,
    isLoading,
    signIn,
    signOut,
  }
}
```

**Commit:**
```bash
git add src/hooks/useAuth.ts
git commit -m "feat: update useAuth to use Supabase Auth"
```

---

### Task 4.4: Atualizar Página de Login

**Arquivos:** `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\app\(auth)\login\page.tsx`

**Passos:**

1. **Atualizar imports e lógica:**
```typescript
'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn, isLoading } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Preencha todos os campos')
      return
    }

    try {
      await signIn(email, password)
      toast.success('Login realizado com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-red-600 dark:text-red-500">
            VIBEDISTRO
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Intranet & CRM
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>

        <div className="text-sm text-center text-gray-500">
          <p>Credenciais de teste:</p>
          <p className="font-mono">Qualquer email mockado + password123</p>
        </div>
      </Card>
    </div>
  )
}
```

**Commit:**
```bash
git add src/app/(auth)/login/page.tsx
git commit -m "feat: update login page for Supabase Auth"
```

---

## Fase 5: Criar Hooks com Supabase Queries

### Task 5.1: Atualizar useTasks para Supabase

**Arquivos:** `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\hooks\useTasks.ts`

**Passos:**

1. **Substituir lógica mockada por queries Supabase:**
```typescript
'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { Task } from '@/types/tasks'
import {
  isToday,
  isTomorrow,
  isThisWeek,
  isThisMonth,
  isPast,
  startOfDay,
} from 'date-fns'

// ... manter interfaces TaskFilters, TaskStats, UseTasksReturn

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filters, setFilters] = useState<TaskFilters>({})
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  // Fetch inicial de tarefas
  useEffect(() => {
    if (!user) return

    fetchTasks()
  }, [user])

  async function fetchTasks() {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setTasks(
        data.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          status: t.status,
          priority: t.priority,
          dueDate: t.due_date ? new Date(t.due_date) : undefined,
          assignedTo: t.assigned_to,
          sector: t.sector,
          createdBy: t.created_by,
          tags: t.tags || [],
          createdAt: new Date(t.created_at),
          updatedAt: new Date(t.updated_at),
        }))
      )
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Criar tarefa
  const createTask = useCallback(
    async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          due_date: taskData.dueDate?.toISOString(),
          assigned_to: taskData.assignedTo,
          sector: taskData.sector,
          created_by: user.id,
          tags: taskData.tags || [],
        })
        .select()
        .single()

      if (error) throw error

      const newTask: Task = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        status: data.status,
        priority: data.priority,
        dueDate: data.due_date ? new Date(data.due_date) : undefined,
        assignedTo: data.assigned_to,
        sector: data.sector,
        createdBy: data.created_by,
        tags: data.tags || [],
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      }

      setTasks((prev) => [newTask, ...prev])
      return newTask
    },
    [user]
  )

  // Atualizar tarefa
  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        title: updates.title,
        description: updates.description,
        status: updates.status,
        priority: updates.priority,
        due_date: updates.dueDate?.toISOString(),
        assigned_to: updates.assignedTo,
        sector: updates.sector,
        tags: updates.tags,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const updatedTask: Task = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      status: data.status,
      priority: data.priority,
      dueDate: data.due_date ? new Date(data.due_date) : undefined,
      assignedTo: data.assigned_to,
      sector: data.sector,
      createdBy: data.created_by,
      tags: data.tags || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }

    setTasks((prev) =>
      prev.map((task) => (task.id === id ? updatedTask : task))
    )

    return updatedTask
  }, [])

  // Deletar tarefa
  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)

    if (error) throw error

    setTasks((prev) => prev.filter((t) => t.id !== id))
    return true
  }, [])

  // ... manter funções auxiliares (isOverdue, matchesDateFilter, stats, filteredTasks, etc)

  return {
    tasks,
    filteredTasks,
    filters,
    stats,
    setFilters,
    createTask,
    updateTask,
    deleteTask,
    getTaskById,
    getTasksByStatus,
    getOverdueTasks,
    getTasksDueToday,
    getTasksDueThisWeek,
    isLoading,
  }
}
```

**Commit:**
```bash
git add src/hooks/useTasks.ts
git commit -m "feat: migrate useTasks to Supabase queries"
```

---

### Task 5.2: Atualizar useTickets para Supabase

**Arquivos:** `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\hooks\useTickets.ts`

**Passos:**

1. **Migrar para queries Supabase** (similar ao useTasks)
2. **Incluir queries para ticket_history e ticket_comments**
3. **Manter interface idêntica para não quebrar componentes**

**Commit:**
```bash
git add src/hooks/useTickets.ts
git commit -m "feat: migrate useTickets to Supabase queries"
```

---

### Task 5.3: Atualizar useChat para Supabase + Realtime

**Arquivos:** `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\hooks\useChat.ts`

**Passos:**

1. **Migrar para Supabase com Realtime subscriptions:**
```typescript
'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { ChatRoom, Message } from '@/types/chat'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useChat(): UseChatReturn {
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  let realtimeChannel: RealtimeChannel | null = null

  // Fetch salas onde usuário participa
  useEffect(() => {
    if (!user) return

    fetchRooms()
  }, [user])

  // Subscribe em mensagens da sala atual (Realtime)
  useEffect(() => {
    if (!currentRoom) return

    fetchMessages()
    subscribeToMessages()

    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel)
      }
    }
  }, [currentRoom])

  async function fetchRooms() {
    if (!user) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .contains('participants', [user.id])
        .order('updated_at', { ascending: false })

      if (error) throw error

      setRooms(
        data.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          sector: r.sector,
          participants: r.participants,
          createdAt: new Date(r.created_at),
          updatedAt: new Date(r.updated_at),
        }))
      )
    } catch (error) {
      console.error('Error fetching rooms:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchMessages() {
    if (!currentRoom) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', currentRoom.id)
        .order('timestamp', { ascending: true })
        .limit(100)

      if (error) throw error

      setMessages(
        data.map((m) => ({
          id: m.id,
          roomId: m.room_id,
          userId: m.user_id,
          content: m.content,
          type: m.type,
          timestamp: new Date(m.timestamp),
        }))
      )
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  function subscribeToMessages() {
    if (!currentRoom) return

    // Subscribe em novas mensagens (Realtime)
    realtimeChannel = supabase
      .channel(`room:${currentRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${currentRoom.id}`,
        },
        (payload) => {
          const newMessage: Message = {
            id: payload.new.id,
            roomId: payload.new.room_id,
            userId: payload.new.user_id,
            content: payload.new.content,
            type: payload.new.type,
            timestamp: new Date(payload.new.timestamp),
          }
          setMessages((prev) => [...prev, newMessage])
        }
      )
      .subscribe()
  }

  const sendMessage = useCallback(
    async (content: string) => {
      if (!currentRoom || !user || !content.trim()) return

      try {
        const { error } = await supabase.from('messages').insert({
          room_id: currentRoom.id,
          user_id: user.id,
          content: content.trim(),
          type: 'text',
        })

        if (error) throw error
      } catch (error) {
        console.error('Error sending message:', error)
      }
    },
    [currentRoom, user]
  )

  const createDM = useCallback(
    async (userId: string, userName: string) => {
      if (!user) throw new Error('User not authenticated')

      // Verificar se DM já existe
      const existingDM = rooms.find(
        (r) => r.type === 'dm' && r.participants.includes(userId)
      )

      if (existingDM) return existingDM

      // Criar novo DM
      const { data, error } = await supabase
        .from('chat_rooms')
        .insert({
          name: userName,
          type: 'dm',
          participants: [user.id, userId],
        })
        .select()
        .single()

      if (error) throw error

      const newRoom: ChatRoom = {
        id: data.id,
        name: data.name,
        type: data.type,
        sector: data.sector,
        participants: data.participants,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      }

      setRooms((prev) => [newRoom, ...prev])
      return newRoom
    },
    [user, rooms]
  )

  // ... manter demais funções auxiliares

  return {
    rooms,
    sectorRooms,
    dmRooms,
    currentRoom,
    messages,
    setCurrentRoom,
    sendMessage,
    createDM,
    getExistingDMUserIds,
    getUserById,
    getDMUserInfo,
    availableUsers,
    isLoading,
    typingUsers: [],
  }
}
```

**Commit:**
```bash
git add src/hooks/useChat.ts
git commit -m "feat: migrate useChat to Supabase with Realtime"
```

---

### Task 5.4: Atualizar useDrive para Supabase + Storage

**Arquivos:** `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\hooks\useDrive.ts`

**Passos:**

1. **Integrar queries de drive_items com Supabase Storage**
2. **Implementar upload real usando helpers de storage.ts**
3. **Manter interface de hooks**

**Commit:**
```bash
git add src/hooks/useDrive.ts
git commit -m "feat: migrate useDrive to Supabase with Storage"
```

---

### Task 5.5: Atualizar useCourses e useCalendar

**Arquivos:**
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\hooks\useCourses.ts`
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\hooks\useCalendar.ts`

**Passos:**

1. **Migrar lógica para queries Supabase**
2. **Manter interfaces**

**Commit:**
```bash
git add src/hooks/useCourses.ts src/hooks/useCalendar.ts
git commit -m "feat: migrate useCourses and useCalendar to Supabase"
```

---

## Fase 6: Seeding de Dados Mockados

### Task 6.1: Criar Script de Seed

**Arquivos:** `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\scripts\seed-supabase.ts` (novo)

**Passos:**

1. **Criar diretório `scripts`**

2. **Criar `scripts/seed-supabase.ts`:**
```typescript
/**
 * Script para popular Supabase com dados mockados
 * Executar apenas uma vez em desenvolvimento
 */

import { createClient } from '@supabase/supabase-js'
import { mockTasks, mockTickets, mockChatRooms, mockMessages, /* ... */ } from '../src/lib/mock-data'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role para bypass RLS
)

async function seedTasks() {
  console.log('Seeding tasks...')
  const { error } = await supabase.from('tasks').insert(
    mockTasks.map((t) => ({
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      due_date: t.dueDate?.toISOString(),
      assigned_to: t.assignedTo,
      sector: t.sector,
      created_by: t.createdBy,
      tags: t.tags,
    }))
  )
  if (error) console.error('Error seeding tasks:', error)
  else console.log('✅ Tasks seeded')
}

async function seedTickets() {
  console.log('Seeding tickets...')
  // Similar para tickets
}

async function seedChatRooms() {
  console.log('Seeding chat rooms...')
  // Similar para chat
}

async function main() {
  console.log('🌱 Starting Supabase seed...')

  await seedTasks()
  await seedTickets()
  await seedChatRooms()
  // ... demais seeds

  console.log('✅ Seed completed!')
}

main()
```

3. **Adicionar script ao package.json:**
```json
{
  "scripts": {
    "seed": "tsx scripts/seed-supabase.ts"
  }
}
```

4. **Instalar tsx:**
```bash
npm install -D tsx
```

5. **Executar seed:**
```bash
npm run seed
```

**Commit:**
```bash
git add scripts/ package.json
git commit -m "feat: add Supabase seeding script"
```

---

## Fase 7: Feature Flags & Testing

### Task 7.1: Implementar Feature Flags

**Arquivos:** `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\lib\feature-flags.ts` (novo)

**Passos:**

1. **Criar `src/lib/feature-flags.ts`:**
```typescript
/**
 * Feature Flags
 * Controla uso de mock vs Supabase
 */

export const USE_MOCK_DATA =
  process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'

export const USE_SUPABASE_AUTH =
  process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === 'true'

export const USE_SUPABASE_REALTIME =
  process.env.NEXT_PUBLIC_USE_SUPABASE_REALTIME === 'true'
```

2. **Atualizar hooks para respeitar flags:**
```typescript
// Exemplo em useTasks.ts
import { USE_MOCK_DATA } from '@/lib/feature-flags'

export function useTasks() {
  if (USE_MOCK_DATA) {
    // Usar lógica antiga mockada
  } else {
    // Usar Supabase
  }
}
```

**Commit:**
```bash
git add src/lib/feature-flags.ts
git commit -m "feat: add feature flags for gradual migration"
```

---

### Task 7.2: Testar Integração Completa

**Passos:**

1. **Habilitar Supabase no `.env.local`:**
```env
NEXT_PUBLIC_USE_MOCK_DATA=false
NEXT_PUBLIC_USE_SUPABASE_AUTH=true
NEXT_PUBLIC_USE_SUPABASE_REALTIME=true
```

2. **Iniciar servidor de desenvolvimento:**
```bash
npm run dev
```

3. **Testar fluxo completo:**
   - ✅ Login com Supabase Auth
   - ✅ Criar tarefa
   - ✅ Enviar mensagem no chat (verificar Realtime)
   - ✅ Upload de arquivo no Drive
   - ✅ Criar evento no calendário
   - ✅ Verificar RLS (tentar acessar dados de outro setor)

4. **Verificar logs e erros**

**Documentar:** Testes realizados com sucesso

---

## Fase 8: Documentação e Cleanup

### Task 8.1: Atualizar CLAUDE.md

**Arquivos:** `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\CLAUDE.md`

**Passos:**

1. **Atualizar seção de Stack Tecnológica:**
```markdown
## Stack Tecnológica

- **Framework:** Next.js 16.1+ (App Router) com TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Autenticação:** Supabase Auth
- **UI:** Shadcn/UI + Radix UI + Tailwind CSS
- ...
```

2. **Adicionar seção de Supabase:**
```markdown
## Configuração do Supabase

### Credenciais
- **Project URL:** https://tuwqhdayuefuchotrspq.supabase.co
- **Anon Key:** sb_publishable_1qYAr2vDQo8QIziNR7PtDQ_dsTslvss

### Database Schema
Ver migrations em `docs/supabase-migrations.md`

### RLS Policies
Todas as tabelas possuem Row Level Security habilitada. Consulte policies no SQL Editor.

### Realtime
Habilitado para:
- `public.messages` (chat)
- `public.chat_rooms` (salas de chat)
```

**Commit:**
```bash
git add CLAUDE.md
git commit -m "docs: update project documentation with Supabase"
```

---

### Task 8.2: Remover Código Mockado (Opcional)

**Arquivos:** `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\lib\mock-data.ts`

**Passos:**

1. **Manter arquivo para referência ou deletar:**
```bash
# Opção 1: Mover para docs
mv src/lib/mock-data.ts docs/legacy-mock-data.ts

# Opção 2: Deletar completamente
rm src/lib/mock-data.ts
```

**Commit:**
```bash
git add .
git commit -m "chore: remove legacy mock data"
```

---

## Resumo Final

### Ordem de Implementação

1. ✅ **Fase 1:** Setup inicial (deps, env, clients)
2. ✅ **Fase 2:** Database schema (7 migrations)
3. ✅ **Fase 3:** Storage configuration
4. ✅ **Fase 4:** Migração de Auth
5. ✅ **Fase 5:** Hooks com Supabase queries
6. ✅ **Fase 6:** Seeding de dados
7. ✅ **Fase 7:** Feature flags e testes
8. ✅ **Fase 8:** Documentação

### Próximos Passos (Pós-Implementação)

- [ ] Configurar backups automáticos no Supabase
- [ ] Implementar rate limiting nas Edge Functions
- [ ] Configurar monitoramento de logs
- [ ] Otimizar indexes baseado em queries lentas
- [ ] Implementar cache com React Query
- [ ] Adicionar analytics (Vercel Analytics)
- [ ] Configurar CI/CD com testes automatizados

---

## Arquivos Críticos para Implementação

- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\lib\supabase\client.ts` - Cliente Supabase browser
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\lib\supabase\server.ts` - Cliente Supabase server
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\lib\supabase\database.types.ts` - TypeScript types gerados
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\lib\supabase\storage.ts` - Helpers de Storage
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\lib\auth.ts` - Auth configuration migrada
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\hooks\useTasks.ts` - Hook de tarefas com Supabase
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\hooks\useChat.ts` - Hook de chat com Realtime
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\src\middleware.ts` - Middleware atualizado
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\.env.local` - Variáveis de ambiente
- `C:\Users\ksinh\Documents\TRABALHOS 2026\CLAUDE\vibeoffice\scripts\seed-supabase.ts` - Script de seeding
