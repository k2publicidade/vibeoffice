-- ============================================
-- Migration 020: Habilitar Realtime em Tabelas
-- Data: 2026-01-07
-- Descrição: Ativar Supabase Realtime para sincronização em tempo real
-- ============================================

-- ============================================
-- ATIVAR REALTIME NAS TABELAS
-- ============================================

-- Tasks: Para sincronização de kanban board em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- Tickets: Para sincronização de chamados em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;

-- Messages: Para chat em tempo real (já deve estar habilitado)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Chat Rooms: Para atualização de salas em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;

-- Notifications: Para notificações in-app em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar quais tabelas têm Realtime habilitado
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ============================================
-- OBSERVAÇÕES
-- ============================================

-- Agora as seguintes operações acontecerão em tempo real:
--
-- TASKS:
-- - User A cria/move/deleta task → User B vê instantaneamente
--
-- TICKETS:
-- - User A cria/atualiza/deleta ticket → User B vê instantaneamente
--
-- MESSAGES:
-- - User A envia mensagem → User B recebe instantaneamente
--
-- NOTIFICATIONS:
-- - User A gera evento → User B recebe notificação instantaneamente
--
-- Performance: Realtime usa WebSockets e é extremamente eficiente.
-- Custo: Incluído no plano Supabase (sem cobrança adicional até ~2M mensagens/mês)
