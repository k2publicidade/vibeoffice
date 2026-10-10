BEGIN;

-- Editing must enforce the same sector authorization as creation.
ALTER POLICY calendar_edit ON public.calendar_events
  USING (created_by = auth.uid() OR public.office_staff())
  WITH CHECK (
    (created_by = auth.uid() OR public.office_staff())
    AND (type <> 'sector' OR sector = public.office_sector() OR public.office_staff())
  );

COMMIT;
