BEGIN;
-- New accounts are provisioned by the server admin API, never by public signup.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 INSERT INTO public.users(id,email,name,sector,role,avatar) VALUES(NEW.id,NEW.email,coalesce(nullif(NEW.raw_user_meta_data->>'name',''),split_part(NEW.email,'@',1)),'Administrativo','Colaborador',NEW.raw_user_meta_data->>'avatar'); RETURN NEW; END $$;
REVOKE UPDATE ON messages FROM authenticated;
GRANT UPDATE(content) ON messages TO authenticated;
CREATE FUNCTION public.protect_room_members() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF current_user='authenticated' AND (NEW.participants IS DISTINCT FROM OLD.participants OR NEW.type<>OLD.type OR NEW.sector IS DISTINCT FROM OLD.sector OR NEW.created_by IS DISTINCT FROM OLD.created_by) AND auth.uid() IS DISTINCT FROM OLD.created_by THEN RAISE EXCEPTION 'Somente o criador gerencia participantes'; END IF; RETURN NEW; END $$;
CREATE TRIGGER protect_room_members BEFORE UPDATE ON chat_rooms FOR EACH ROW EXECUTE FUNCTION public.protect_room_members();
CREATE OR REPLACE FUNCTION public.can_drive(i uuid, writing boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH RECURSIVE ancestry AS (SELECT id,parent_id,uploaded_by,is_public,sector FROM public.drive_items WHERE id=i UNION SELECT d.id,d.parent_id,d.uploaded_by,d.is_public,d.sector FROM public.drive_items d JOIN ancestry a ON d.id=a.parent_id)
 SELECT public.office_role()='Admin' OR EXISTS(SELECT 1 FROM ancestry a WHERE a.uploaded_by=auth.uid() OR (NOT writing AND (a.is_public OR a.sector=public.office_sector())) OR EXISTS(SELECT 1 FROM public.shared_access s WHERE s.item_id=a.id AND s.user_id=auth.uid() AND (NOT writing OR s.permission IN('edit','manage')))) $$;
REVOKE EXECUTE ON FUNCTION public.protect_room_members() FROM PUBLIC,anon,authenticated;
ALTER TABLE users ADD COLUMN active boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.office_role() RETURNS public.role_type LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT role FROM public.users WHERE id=auth.uid() AND active $$;
CREATE OR REPLACE FUNCTION public.office_sector() RETURNS public.sector_type LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT sector FROM public.users WHERE id=auth.uid() AND active $$;
CREATE OR REPLACE FUNCTION public.protect_profile() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF current_user='authenticated' AND (NEW.id<>OLD.id OR NEW.email<>OLD.email OR (public.office_role() IS DISTINCT FROM 'Admin'::public.role_type AND (NEW.role<>OLD.role OR NEW.sector<>OLD.sector OR NEW.active<>OLD.active))) THEN RAISE EXCEPTION 'Somente o ADMIN pode alterar cargo ou setor'; END IF; RETURN NEW; END $$;
DO $$ DECLARE t text; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP EXECUTE format('CREATE POLICY office_active ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING(public.office_role() IS NOT NULL) WITH CHECK(public.office_role() IS NOT NULL)',t); END LOOP; END $$;
COMMIT;
