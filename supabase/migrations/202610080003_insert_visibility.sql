BEGIN;
-- INSERT ... RETURNING checks SELECT before the new tuple is visible to lookup helpers.
ALTER POLICY tasks_read ON tasks USING(public.office_staff() OR created_by=auth.uid() OR assigned_to=auth.uid() OR public.can_task(id));
ALTER POLICY tickets_read ON tickets USING(public.office_staff() OR requester=auth.uid() OR assigned_to=auth.uid() OR public.can_ticket(id));
ALTER POLICY rooms_read ON chat_rooms USING(auth.uid()=ANY(participants) OR (type='sector' AND sector=public.office_sector()));
ALTER POLICY drive_read ON drive_items USING(uploaded_by=auth.uid() OR public.can_drive(id));
COMMIT;
