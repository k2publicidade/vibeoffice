BEGIN;
-- Optional MFA must be enforced below the browser/server redirects as well.
CREATE FUNCTION public.office_mfa_ok() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (
   auth.jwt()->>'aal' = 'aal2'
   OR NOT EXISTS (
     SELECT 1 FROM auth.mfa_factors
     WHERE user_id=auth.uid() AND status='verified'
   )
 );
$$;
REVOKE EXECUTE ON FUNCTION public.office_mfa_ok() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.office_mfa_ok() TO authenticated;
CREATE OR REPLACE FUNCTION public.office_role() RETURNS public.role_type
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT role FROM public.users WHERE id=auth.uid() AND active AND public.office_mfa_ok();
$$;
CREATE OR REPLACE FUNCTION public.office_sector() RETURNS public.sector_type
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT sector FROM public.users WHERE id=auth.uid() AND active AND public.office_mfa_ok();
$$;
-- Keep only the caller's active sign-in profile readable until verification.
-- UPDATE/INSERT still require the fully authorized role through WITH CHECK.
ALTER POLICY users_read ON public.users USING (
  public.office_role() IS NOT NULL OR (id=auth.uid() AND active)
);
ALTER POLICY office_active ON public.users USING (
  public.office_role() IS NOT NULL OR (id=auth.uid() AND active)
) WITH CHECK (public.office_role() IS NOT NULL);
-- SECURITY DEFINER mutations must not bypass the active/MFA checks.
CREATE OR REPLACE FUNCTION public.can_room(r uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.office_role() IS NOT NULL AND EXISTS(
   SELECT 1 FROM public.chat_rooms WHERE id=r AND (
     auth.uid()=ANY(participants)
     OR (type='sector' AND sector=public.office_sector())
   )
 );
$$;
CREATE OR REPLACE FUNCTION public.can_task(t uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.office_role() IS NOT NULL AND EXISTS(
   SELECT 1 FROM public.tasks WHERE id=t AND (
     public.office_staff() OR created_by=auth.uid() OR assigned_to=auth.uid()
     OR EXISTS(SELECT 1 FROM public.task_assignees WHERE task_id=t AND user_id=auth.uid())
   )
 );
$$;
CREATE OR REPLACE FUNCTION public.can_ticket(t uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.office_role() IS NOT NULL AND EXISTS(
   SELECT 1 FROM public.tickets WHERE id=t AND (
     public.office_staff() OR requester=auth.uid() OR assigned_to=auth.uid()
     OR (linked_task_id IS NOT NULL AND public.can_task(linked_task_id))
   )
 );
$$;
NOTIFY pgrst,'reload schema';
COMMIT;
