-- ============================================
-- Migration 020: Correção de Permissões de Notificação e Tabela Push
-- Data: 2026-01-08
-- Descrição: 
-- 1. Permite que usuários autenticados criem notificações (para sync Tasks -> Notifications funcionar).
-- 2. Cria a tabela push_subscriptions que estava faltando (corrigindo erro 404).
-- ============================================

-- 1. CORRIGIR PERMISSÕES DE NOTIFICATIONS (Erro 403)
-- Permitir que usuários autenticados insiram notificações (necessário para eventos client-side)
CREATE POLICY "Users can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');


-- 2. CRIAR TABELA PUSH_SUBSCRIPTIONS (Erro 404)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_push_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_endpoint ON public.push_subscriptions(endpoint); // Evitar duplicatas

-- RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
