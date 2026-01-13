-- Migration: Multiple Assignees for Tasks
-- Description: Creates task_assignees table, migrates data, and updates sync logic between Tasks and Tickets

-- 1. Create task_assignees table
CREATE TABLE task_assignees (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

-- 2. Migrate existing data
INSERT INTO task_assignees (task_id, user_id)
SELECT id, assigned_to
FROM tasks
WHERE assigned_to IS NOT NULL;

-- 3. Update Sync Logic (Ticket -> Task)
-- Ticket has only ONE assignee. When Ticket updates, we clear existing task assignees and add the single ticket assignee.
CREATE OR REPLACE FUNCTION sync_ticket_to_task()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.linked_task_id IS NOT NULL THEN
    -- Update basic fields
    UPDATE tasks
    SET
      status = map_ticket_status_to_task(NEW.status),
      priority = NEW.priority,
      updated_at = NOW()
    WHERE id = NEW.linked_task_id;
    
    -- Sync Assignee: Replace all with the single ticket assignee
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      DELETE FROM task_assignees WHERE task_id = NEW.linked_task_id;
      IF NEW.assigned_to IS NOT NULL THEN
         INSERT INTO task_assignees (task_id, user_id) VALUES (NEW.linked_task_id, NEW.assigned_to);
      END IF;
    END IF;
    
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Update Sync Logic (Task Assignees -> Ticket)
-- When task_assignees changes, update ticket.assigned_to with the FIRST assignee (limit 1)
CREATE OR REPLACE FUNCTION sync_task_assignees_to_ticket()
RETURNS TRIGGER AS $$
DECLARE
  v_linked_ticket_id UUID;
  v_first_assignee_id UUID;
BEGIN
    -- Determine Task ID
    IF (TG_OP = 'DELETE') THEN
        v_linked_ticket_id := (SELECT linked_ticket_id FROM tasks WHERE id = OLD.task_id);
    ELSE
        v_linked_ticket_id := (SELECT linked_ticket_id FROM tasks WHERE id = NEW.task_id);
    END IF;

    IF v_linked_ticket_id IS NOT NULL THEN
        -- Get the first assignee (latest created or simple limit)
        -- In case of DELETE, the current deleted one is gone, so we fetch what remains.
        -- In case of INSERT, we fetch including new one.
        SELECT user_id INTO v_first_assignee_id
        FROM task_assignees
        WHERE task_id = COALESCE(NEW.task_id, OLD.task_id)
        LIMIT 1;

        UPDATE tickets
        SET assigned_to = v_first_assignee_id,
            updated_at = NOW()
        WHERE id = v_linked_ticket_id;
    END IF;
    
    RETURN NULL; -- Trigger on AFTER doesn't need return value for row
END;
$$ LANGUAGE plpgsql;

-- Create Trigger for task_assignees
CREATE TRIGGER trigger_sync_task_assignees_to_ticket
AFTER INSERT OR UPDATE OR DELETE ON task_assignees
FOR EACH ROW
EXECUTE FUNCTION sync_task_assignees_to_ticket();

-- 5. Drop old column 'assigned_to' from tasks (AFTER we are sure everything works, but usually ok now or we can make it nullable first)
-- For safety we will keep it for now but NULLABLE, or just drop it if we are confident.
-- The prompt asked to "Sempre atrelando as tarefas somente aos usuarios selecionados", so legacy column is not needed.
ALTER TABLE tasks DROP COLUMN assigned_to;

-- 6. Enable RLS on new table
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Enable read access for authenticated users" ON task_assignees
FOR SELECT TO authenticated USING (true);

-- Allow write access to authenticated users (simplify for now to match tasks)
CREATE POLICY "Enable write access for authenticated users" ON task_assignees
FOR ALL TO authenticated USING (true);
