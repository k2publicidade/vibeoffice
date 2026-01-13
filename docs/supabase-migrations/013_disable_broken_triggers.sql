-- DESCRIÇÃO: Remove os triggers de sincronização Tasks <-> Tickets que estavam quebrados e causando loops/erros.
-- A sincronização agora é tratada de forma robusta pelo Front-end (useTasks hook).

-- 1. Remover Triggers
DROP TRIGGER IF EXISTS trigger_sync_ticket_to_task ON tickets;
DROP TRIGGER IF EXISTS trigger_sync_task_to_ticket ON tasks;

-- 2. Remover Funções de Trigger
DROP FUNCTION IF EXISTS sync_ticket_to_task();
DROP FUNCTION IF EXISTS sync_task_to_ticket();

-- 3. Remover Funções Auxiliares (que estavam faltando e causando erro 42883)
DROP FUNCTION IF EXISTS map_task_status_to_ticket(text);
DROP FUNCTION IF EXISTS map_ticket_status_to_task(text);
