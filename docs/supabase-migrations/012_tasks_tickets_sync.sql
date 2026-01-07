-- Migration: Sincronização Automática Tasks ↔ Tickets
-- Data: 2026-01-07
-- Descrição: Adiciona campos de vínculo e triggers para sincronização 1:1 entre tasks e tickets

-- 1. Adicionar campos de vínculo
ALTER TABLE tasks
ADD COLUMN linked_ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE;

ALTER TABLE tickets
ADD COLUMN linked_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- 2. Constraint: apenas um vínculo por task/ticket
ALTER TABLE tasks
ADD CONSTRAINT check_task_ticket_link UNIQUE (linked_ticket_id);

ALTER TABLE tickets
ADD CONSTRAINT check_ticket_task_link UNIQUE (linked_task_id);

-- 3. Índices para performance
CREATE INDEX idx_tasks_linked_ticket ON tasks(linked_ticket_id);
CREATE INDEX idx_tickets_linked_task ON tickets(linked_task_id);

-- 4. Função para mapear status Task → Ticket
CREATE OR REPLACE FUNCTION map_task_status_to_ticket(task_status TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE task_status
    WHEN 'todo' THEN 'open'
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'done' THEN 'completed'
    ELSE 'open'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Função para mapear status Ticket → Task
CREATE OR REPLACE FUNCTION map_ticket_status_to_task(ticket_status TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE ticket_status
    WHEN 'open' THEN 'todo'
    WHEN 'analyzing' THEN 'in_progress'
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'completed' THEN 'done'
    ELSE 'todo'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Trigger: Quando ticket é atualizado, atualizar task vinculada
CREATE OR REPLACE FUNCTION sync_ticket_to_task()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.linked_task_id IS NOT NULL THEN
    UPDATE tasks
    SET
      status = map_ticket_status_to_task(NEW.status),
      priority = NEW.priority,
      assigned_to = NEW.assigned_to,
      updated_at = NOW()
    WHERE id = NEW.linked_task_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_ticket_to_task
AFTER UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION sync_ticket_to_task();

-- 7. Trigger: Quando task é atualizada, atualizar ticket vinculado
CREATE OR REPLACE FUNCTION sync_task_to_ticket()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.linked_ticket_id IS NOT NULL THEN
    UPDATE tickets
    SET
      title = NEW.title,
      description = NEW.description,
      status = map_task_status_to_ticket(NEW.status),
      priority = NEW.priority,
      assigned_to = NEW.assigned_to,
      updated_at = NOW()
    WHERE id = NEW.linked_ticket_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_task_to_ticket
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION sync_task_to_ticket();

-- Comentários
COMMENT ON COLUMN tasks.linked_ticket_id IS 'ID do ticket vinculado (opcional). Sincronização 1:1 via triggers.';
COMMENT ON COLUMN tickets.linked_task_id IS 'ID da task vinculada (opcional). Sincronização 1:1 via triggers.';
COMMENT ON FUNCTION map_task_status_to_ticket IS 'Mapeia status de task (todo/in_progress/done) para status de ticket (open/in_progress/completed)';
COMMENT ON FUNCTION map_ticket_status_to_task IS 'Mapeia status de ticket (open/analyzing/in_progress/completed) para status de task (todo/in_progress/done)';
COMMENT ON TRIGGER trigger_sync_ticket_to_task ON tickets IS 'Sincroniza updates do ticket para a task vinculada';
COMMENT ON TRIGGER trigger_sync_task_to_ticket ON tasks IS 'Sincroniza updates da task para o ticket vinculado';
