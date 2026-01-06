-- SCRIPT OTIMIZADO - Aplicar permissões essenciais

-- 1. USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_users_select" ON public.users FOR SELECT USING (true);
CREATE POLICY "pub_users_insert" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "pub_users_update" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "pub_users_delete" ON public.users FOR DELETE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin'));

-- 2. TASKS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_tasks_select" ON public.tasks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pub_tasks_insert" ON public.tasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pub_tasks_update" ON public.tasks FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "pub_tasks_delete" ON public.tasks FOR DELETE USING (auth.uid() IS NOT NULL);

-- 3. TICKETS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_tickets_select" ON public.tickets FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pub_tickets_insert" ON public.tickets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pub_tickets_update" ON public.tickets FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 4. TICKET COMMENTS
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_ticket_comments_select" ON public.ticket_comments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pub_ticket_comments_insert" ON public.ticket_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 5. TICKET HISTORY
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_ticket_history_select" ON public.ticket_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pub_ticket_history_insert" ON public.ticket_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 6. CHAT ROOMS
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_chat_rooms_select" ON public.chat_rooms FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pub_chat_rooms_insert" ON public.chat_rooms FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 7. MESSAGES
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_messages_select" ON public.messages FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pub_messages_insert" ON public.messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 8. DRIVE ITEMS
ALTER TABLE public.drive_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_drive_items_select" ON public.drive_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pub_drive_items_insert" ON public.drive_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pub_drive_items_update" ON public.drive_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "pub_drive_items_delete" ON public.drive_items FOR DELETE USING (auth.uid() IS NOT NULL);

-- 9. SHARED ACCESS
ALTER TABLE public.shared_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_shared_access_select" ON public.shared_access FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pub_shared_access_insert" ON public.shared_access FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 10. COURSES
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_courses_select" ON public.courses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pub_courses_insert" ON public.courses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 11. LESSONS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_lessons_select" ON public.lessons FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pub_lessons_insert" ON public.lessons FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 12. COURSE PROGRESS
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_course_progress_select" ON public.course_progress FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pub_course_progress_insert" ON public.course_progress FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pub_course_progress_update" ON public.course_progress FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 13. CALENDAR EVENTS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_calendar_events_select" ON public.calendar_events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pub_calendar_events_insert" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pub_calendar_events_update" ON public.calendar_events FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "pub_calendar_events_delete" ON public.calendar_events FOR DELETE USING (auth.uid() IS NOT NULL);

-- 14. STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('drive-files', 'drive-files', false) ON CONFLICT (id) DO NOTHING;

-- 15. STORAGE POLICIES (limpar antigas primeiro)
DROP POLICY IF EXISTS "auth_users_upload" ON storage.objects;
DROP POLICY IF EXISTS "auth_users_select" ON storage.objects;
DROP POLICY IF EXISTS "auth_users_update" ON storage.objects;
DROP POLICY IF EXISTS "auth_users_delete" ON storage.objects;

CREATE POLICY "auth_users_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'drive-files' AND auth.uid() IS NOT NULL);
CREATE POLICY "auth_users_select" ON storage.objects FOR SELECT USING (bucket_id = 'drive-files' AND auth.uid() IS NOT NULL);
CREATE POLICY "auth_users_update" ON storage.objects FOR UPDATE USING (bucket_id = 'drive-files' AND auth.uid() IS NOT NULL);
CREATE POLICY "auth_users_delete" ON storage.objects FOR DELETE USING (bucket_id = 'drive-files' AND auth.uid() IS NOT NULL);
