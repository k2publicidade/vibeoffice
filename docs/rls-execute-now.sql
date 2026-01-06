-- ============================================================
-- VIBEDISTRO - RLS COMPLETO - COPIE E EXECUTE NO SUPABASE
-- ============================================================
-- Cole este script inteiro no SQL Editor do Supabase e execute
-- Ctrl+Enter para rodar

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_manager(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role = 'Gerente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_sector(user_id UUID)
RETURNS sector_type AS $$
DECLARE
  v_sector sector_type;
BEGIN
  SELECT sector INTO v_sector FROM public.users WHERE id = user_id;
  RETURN v_sector;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_in_sector(user_id UUID, check_sector sector_type)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND sector = check_sector
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- USERS TABLE
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_all" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users_insert_admin_only" ON public.users FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "users_delete_admin_only" ON public.users FOR DELETE USING (is_admin(auth.uid()));

-- ============================================================
-- TASKS TABLE
-- ============================================================

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_admin_all" ON public.tasks FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "tasks_manager_own_sector" ON public.tasks FOR ALL USING (is_manager(auth.uid()) AND user_in_sector(auth.uid(), sector));
CREATE POLICY "tasks_manager_view_all" ON public.tasks FOR SELECT USING (is_manager(auth.uid()));
CREATE POLICY "tasks_collaborator_view_own_sector" ON public.tasks FOR SELECT USING (NOT is_manager(auth.uid()) AND NOT is_admin(auth.uid()) AND user_in_sector(auth.uid(), sector));
CREATE POLICY "tasks_update_assigned_to_me" ON public.tasks FOR UPDATE USING (assigned_to = auth.uid()) WITH CHECK (assigned_to = auth.uid());
CREATE POLICY "tasks_insert_own_sector" ON public.tasks FOR INSERT WITH CHECK ((is_admin(auth.uid()) OR is_manager(auth.uid())) OR user_in_sector(auth.uid(), sector));

-- ============================================================
-- TICKETS TABLE
-- ============================================================

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_admin_manager_all" ON public.tickets FOR ALL USING (is_admin(auth.uid()) OR is_manager(auth.uid()));
CREATE POLICY "tickets_user_own" ON public.tickets FOR SELECT USING (requester = auth.uid() OR assigned_to = auth.uid());
CREATE POLICY "tickets_insert_authenticated" ON public.tickets FOR INSERT WITH CHECK (requester = auth.uid());
CREATE POLICY "tickets_update_own" ON public.tickets FOR UPDATE USING (requester = auth.uid()) WITH CHECK (requester = auth.uid());

-- ============================================================
-- TICKET_HISTORY TABLE
-- ============================================================

ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_history_select" ON public.ticket_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tickets
    WHERE id = ticket_history.ticket_id
      AND (requester = auth.uid() OR assigned_to = auth.uid() OR is_admin(auth.uid()) OR is_manager(auth.uid()))
  )
);

CREATE POLICY "ticket_history_insert_system" ON public.ticket_history FOR INSERT WITH CHECK (true);

-- ============================================================
-- TICKET_COMMENTS TABLE
-- ============================================================

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_comments_select" ON public.ticket_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tickets
    WHERE id = ticket_comments.ticket_id
      AND (requester = auth.uid() OR assigned_to = auth.uid() OR is_admin(auth.uid()) OR is_manager(auth.uid()))
  )
  AND (NOT is_internal OR is_admin(auth.uid()) OR is_manager(auth.uid()))
);

CREATE POLICY "ticket_comments_insert" ON public.ticket_comments FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.tickets
    WHERE id = ticket_comments.ticket_id
      AND (requester = auth.uid() OR assigned_to = auth.uid() OR is_admin(auth.uid()) OR is_manager(auth.uid()))
  )
);

CREATE POLICY "ticket_comments_update_own" ON public.ticket_comments FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "ticket_comments_delete_own" ON public.ticket_comments FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- CHAT_ROOMS TABLE
-- ============================================================

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_rooms_select" ON public.chat_rooms FOR SELECT USING (auth.uid() = ANY(participants));
CREATE POLICY "chat_rooms_insert_dm" ON public.chat_rooms FOR INSERT WITH CHECK (type = 'dm' AND auth.uid() = ANY(participants));
CREATE POLICY "chat_rooms_insert_sector_admin" ON public.chat_rooms FOR INSERT WITH CHECK (type = 'sector' AND is_admin(auth.uid()));
CREATE POLICY "chat_rooms_update_manager" ON public.chat_rooms FOR UPDATE USING (type = 'sector' AND is_manager(auth.uid()) AND sector = get_user_sector(auth.uid())) WITH CHECK (type = 'sector' AND is_manager(auth.uid()) AND sector = get_user_sector(auth.uid()));

-- ============================================================
-- MESSAGES TABLE
-- ============================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_rooms
    WHERE id = messages.room_id AND auth.uid() = ANY(participants)
  )
);

CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.chat_rooms
    WHERE id = messages.room_id AND auth.uid() = ANY(participants)
  )
);

-- ============================================================
-- DRIVE_ITEMS TABLE
-- ============================================================

ALTER TABLE public.drive_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drive_items_admin_all" ON public.drive_items FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "drive_items_select_public" ON public.drive_items FOR SELECT USING (is_public = true);
CREATE POLICY "drive_items_select_own_sector" ON public.drive_items FOR SELECT USING (sector IS NOT NULL AND user_in_sector(auth.uid(), sector));
CREATE POLICY "drive_items_select_shared" ON public.drive_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.shared_access
    WHERE item_id = drive_items.id AND user_id = auth.uid()
  )
);

CREATE POLICY "drive_items_insert" ON public.drive_items FOR INSERT WITH CHECK (
  uploaded_by = auth.uid()
  AND (sector IS NULL OR user_in_sector(auth.uid(), sector))
);

CREATE POLICY "drive_items_update" ON public.drive_items FOR UPDATE USING (uploaded_by = auth.uid()) WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "drive_items_delete" ON public.drive_items FOR DELETE USING (uploaded_by = auth.uid());

-- ============================================================
-- SHARED_ACCESS TABLE
-- ============================================================

ALTER TABLE public.shared_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_access_select" ON public.shared_access FOR SELECT USING (user_id = auth.uid() OR shared_by = auth.uid());

CREATE POLICY "shared_access_insert" ON public.shared_access FOR INSERT WITH CHECK (
  shared_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.drive_items
    WHERE id = shared_access.item_id AND uploaded_by = auth.uid()
  )
);

CREATE POLICY "shared_access_delete" ON public.shared_access FOR DELETE USING (shared_by = auth.uid());
CREATE POLICY "shared_access_update" ON public.shared_access FOR UPDATE USING (shared_by = auth.uid()) WITH CHECK (shared_by = auth.uid());

-- ============================================================
-- COURSES TABLE
-- ============================================================

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_select_all" ON public.courses FOR SELECT USING (true);
CREATE POLICY "courses_insert_admin" ON public.courses FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "courses_update_admin" ON public.courses FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "courses_delete_admin" ON public.courses FOR DELETE USING (is_admin(auth.uid()));

-- ============================================================
-- LESSONS TABLE
-- ============================================================

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lessons_select_all" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "lessons_insert_admin" ON public.lessons FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "lessons_update_admin" ON public.lessons FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "lessons_delete_admin" ON public.lessons FOR DELETE USING (is_admin(auth.uid()));

-- ============================================================
-- COURSE_PROGRESS TABLE
-- ============================================================

ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_progress_select_own" ON public.course_progress FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "course_progress_select_admin" ON public.course_progress FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "course_progress_insert_own" ON public.course_progress FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "course_progress_update_own" ON public.course_progress FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "course_progress_update_admin" ON public.course_progress FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ============================================================
-- CALENDAR_EVENTS TABLE
-- ============================================================

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_events_select_admin" ON public.calendar_events FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "calendar_events_select_company" ON public.calendar_events FOR SELECT USING (type = 'company');
CREATE POLICY "calendar_events_select_own_sector" ON public.calendar_events FOR SELECT USING (type = 'sector' AND sector IS NOT NULL AND user_in_sector(auth.uid(), sector));
CREATE POLICY "calendar_events_select_attending" ON public.calendar_events FOR SELECT USING (auth.uid() = ANY(attendees));
CREATE POLICY "calendar_events_insert_personal" ON public.calendar_events FOR INSERT WITH CHECK (created_by = auth.uid() AND type = 'personal');

CREATE POLICY "calendar_events_insert_sector" ON public.calendar_events FOR INSERT WITH CHECK (
  created_by = auth.uid()
  AND type = 'sector'
  AND sector IS NOT NULL
  AND (is_admin(auth.uid()) OR (is_manager(auth.uid()) AND user_in_sector(auth.uid(), sector)))
);

CREATE POLICY "calendar_events_insert_company" ON public.calendar_events FOR INSERT WITH CHECK (created_by = auth.uid() AND type = 'company' AND is_admin(auth.uid()));
CREATE POLICY "calendar_events_update_creator" ON public.calendar_events FOR UPDATE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "calendar_events_delete_creator" ON public.calendar_events FOR DELETE USING (created_by = auth.uid());

-- ============================================================
-- DONE - RLS CONFIGURADO COMPLETO
-- ============================================================
