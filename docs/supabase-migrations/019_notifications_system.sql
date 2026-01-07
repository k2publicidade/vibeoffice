-- ============================================
-- Migration 019: Sistema de Notificações In-App
-- Data: 2026-01-07
-- Descrição: Criar tabelas de notificações e preferências com Realtime
-- ============================================

-- ============================================
-- PASSO 1: CRIAR TABELA NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS 'Notificações in-app para usuários';
COMMENT ON COLUMN public.notifications.type IS 'task_assigned, ticket_assigned, message_received, etc.';
COMMENT ON COLUMN public.notifications.entity_type IS 'task, ticket, message, ou null';
COMMENT ON COLUMN public.notifications.metadata IS 'JSONB com dados extras (nomes, IDs, datas)';


-- ============================================
-- PASSO 2: CRIAR TABELA NOTIFICATION_PREFERENCES
-- ============================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  enable_in_app BOOLEAN DEFAULT true,
  enable_push BOOLEAN DEFAULT false,
  enable_email BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

COMMENT ON TABLE public.notification_preferences IS 'Preferências de notificação por usuário e tipo';


-- ============================================
-- PASSO 3: CRIAR ÍNDICES
-- ============================================

-- Query rápida de notificações recentes por usuário
CREATE INDEX idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

-- Contar não lidas rapidamente
CREATE INDEX idx_notifications_user_read
  ON public.notifications(user_id, read)
  WHERE archived = false;

-- Preferências por usuário
CREATE INDEX idx_preferences_user
  ON public.notification_preferences(user_id);


-- ============================================
-- PASSO 4: HABILITAR ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PASSO 5: CRIAR RLS POLICIES - NOTIFICATIONS
-- ============================================

-- Usuário só vê suas próprias notificações
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Usuário só pode marcar suas notificações como lidas
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role pode inserir notificações
-- (Não criar policy de INSERT para usuários comuns)


-- ============================================
-- PASSO 6: CRIAR RLS POLICIES - PREFERENCES
-- ============================================

-- Usuário gerencia suas próprias preferências
CREATE POLICY "Users can manage own preferences"
  ON public.notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ============================================
-- PASSO 7: HABILITAR REALTIME
-- ============================================

-- Habilitar Realtime para notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ============================================
-- PASSO 8: VERIFICAÇÃO FINAL
-- ============================================

-- Verificar tabelas criadas
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('notifications', 'notification_preferences')
ORDER BY table_name;

-- Verificar RLS habilitado
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('notifications', 'notification_preferences');

-- Verificar policies
SELECT
  tablename,
  policyname,
  cmd as comando
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('notifications', 'notification_preferences')
ORDER BY tablename, policyname;

-- Verificar Realtime
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'notifications';
