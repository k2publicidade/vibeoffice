-- Migration: 022_drive_view_own_items.sql
-- Description: Adiciona política RLS para usuários verem seus próprios itens do Drive
-- Date: 2026-01-12
--
-- PROBLEMA: Usuários não conseguiam ver arquivos que eles mesmos fizeram upload
-- porque faltava uma política SELECT para itens próprios.
--
-- Existiam políticas para:
-- - Admins verem tudo
-- - Usuários verem itens públicos
-- - Usuários verem itens do próprio setor
-- - Usuários verem itens compartilhados
-- - Usuários atualizarem/deletarem próprios itens
--
-- MAS NÃO EXISTIA: Usuários verem seus próprios itens (uploaded_by = auth.uid())

-- Adicionar política para usuários verem seus próprios itens
CREATE POLICY "Users can view own uploaded items"
  ON public.drive_items
  FOR SELECT
  USING (uploaded_by = auth.uid());

-- NOTA: Esta política permite que qualquer usuário autenticado veja
-- os itens que ele mesmo fez upload, independente de setor ou compartilhamento.
