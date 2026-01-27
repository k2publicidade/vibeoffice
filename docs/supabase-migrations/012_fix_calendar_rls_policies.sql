-- Migration: Fix Calendar RLS Policies
-- Data: 2026-01-27
-- Descrição: Adiciona política RLS faltante para usuários verem seus próprios eventos criados

-- Adicionar política para usuários verem eventos que eles criaram
-- Esta política estava faltando, causando eventos salvos não aparecerem para o criador
CREATE POLICY "Users can view own created events"
  ON public.calendar_events
  FOR SELECT
  USING (created_by = auth.uid());

-- Verificar também se a política de INSERT está correta
-- (Já existe, mas garantir que está funcionando)
-- A política existente é: "Authenticated users can create events"
-- USING (auth.role() = 'authenticated')

-- Comentário explicativo
COMMENT ON POLICY "Users can view own created events" ON public.calendar_events IS
'Permite que usuários vejam todos os eventos que eles mesmos criaram, independente do tipo (personal/sector/company)';
