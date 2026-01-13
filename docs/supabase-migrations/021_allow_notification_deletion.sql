-- ============================================
-- Migration 021: Permitir deleção de notificações
-- Data: 2026-01-13
-- Descrição: Permitir que usuários apaguem suas próprias notificações para limpeza ao deletar tarefas/tickets.
-- ============================================

CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  USING (user_id = auth.uid());
