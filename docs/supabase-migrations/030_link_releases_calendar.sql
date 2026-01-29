-- Migration: Link releases to calendar events
-- Allows automatic calendar event creation when releases have dates

-- 1. Add linked_release_id column
ALTER TABLE calendar_events
ADD COLUMN linked_release_id UUID REFERENCES releases(id) ON DELETE SET NULL;

-- 2. Create index for lookups
CREATE INDEX idx_calendar_events_linked_release_id ON calendar_events(linked_release_id);

-- 3. Drop old constraint and recreate with release support
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS check_single_link;

ALTER TABLE calendar_events ADD CONSTRAINT check_single_link CHECK (
  (CASE WHEN linked_task_id IS NOT NULL THEN 1 ELSE 0 END
   + CASE WHEN linked_ticket_id IS NOT NULL THEN 1 ELSE 0 END
   + CASE WHEN linked_release_id IS NOT NULL THEN 1 ELSE 0 END) <= 1
);
