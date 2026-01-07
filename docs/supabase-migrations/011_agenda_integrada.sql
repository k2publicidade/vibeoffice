-- Migration: Agenda Integrada com Tasks/Tickets
-- Data: 2026-01-06
-- Descrição: Adiciona campos para vincular eventos a tasks ou tickets

-- Adicionar campos de vínculo
ALTER TABLE calendar_events
ADD COLUMN linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
ADD COLUMN linked_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL;

-- Constraint: apenas um vínculo por evento
ALTER TABLE calendar_events
ADD CONSTRAINT check_single_link
CHECK (
  (linked_task_id IS NULL AND linked_ticket_id IS NULL) OR
  (linked_task_id IS NOT NULL AND linked_ticket_id IS NULL) OR
  (linked_task_id IS NULL AND linked_ticket_id IS NOT NULL)
);

-- Índices para performance
CREATE INDEX idx_calendar_events_linked_task ON calendar_events(linked_task_id);
CREATE INDEX idx_calendar_events_linked_ticket ON calendar_events(linked_ticket_id);

-- Comentários
COMMENT ON COLUMN calendar_events.linked_task_id IS 'ID da tarefa vinculada (opcional)';
COMMENT ON COLUMN calendar_events.linked_ticket_id IS 'ID do ticket vinculado (opcional)';
COMMENT ON CONSTRAINT check_single_link ON calendar_events IS 'Garante que evento tenha no máximo uma task OU um ticket vinculado';
