BEGIN;
CREATE TABLE public.cover_projects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 config jsonb NOT NULL CHECK(jsonb_typeof(config)='object'),
 briefing text NOT NULL CHECK(length(briefing)<=50000),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 deleted_at timestamptz
);
ALTER TABLE public.cover_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY cover_projects_read ON public.cover_projects FOR SELECT TO authenticated USING(public.office_role() IS NOT NULL AND (created_by=auth.uid() OR public.office_staff()));
CREATE POLICY cover_projects_create ON public.cover_projects FOR INSERT TO authenticated WITH CHECK(public.office_role() IS NOT NULL AND created_by=auth.uid());
CREATE POLICY cover_projects_edit ON public.cover_projects FOR UPDATE TO authenticated USING(public.office_role() IS NOT NULL AND (created_by=auth.uid() OR public.office_staff())) WITH CHECK(public.office_role() IS NOT NULL AND (created_by=auth.uid() OR public.office_staff()));
CREATE FUNCTION public.protect_cover_project() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.id IS DISTINCT FROM OLD.id THEN RAISE EXCEPTION 'Owner cannot change'; END IF;
 NEW.updated_at=now();RETURN NEW;END $$;
CREATE TRIGGER cover_projects_protect BEFORE UPDATE ON public.cover_projects FOR EACH ROW EXECUTE FUNCTION public.protect_cover_project();
CREATE INDEX cover_projects_owner_idx ON public.cover_projects(created_by,created_at DESC);
GRANT SELECT,INSERT,UPDATE ON public.cover_projects TO authenticated;
REVOKE ALL ON public.cover_projects FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_cover_project() FROM PUBLIC,anon,authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cover_projects;
COMMIT;
