BEGIN;
CREATE OR REPLACE FUNCTION public.can_drive(i uuid, writing boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH RECURSIVE ancestry AS (SELECT id,parent_id,uploaded_by,is_public,sector FROM public.drive_items WHERE id=i UNION SELECT d.id,d.parent_id,d.uploaded_by,d.is_public,d.sector FROM public.drive_items d JOIN ancestry a ON d.id=a.parent_id)
 SELECT public.office_role() IS NOT NULL AND (public.office_role()='Admin' OR EXISTS(SELECT 1 FROM ancestry a WHERE a.uploaded_by=auth.uid() OR (NOT writing AND (a.is_public OR a.sector=public.office_sector())) OR EXISTS(SELECT 1 FROM public.shared_access s WHERE s.item_id=a.id AND s.user_id=auth.uid() AND (NOT writing OR s.permission IN('edit','manage'))))) $$;
CREATE FUNCTION public.can_manage_drive(i uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH RECURSIVE ancestry AS (SELECT id,parent_id,uploaded_by FROM public.drive_items WHERE id=i UNION SELECT d.id,d.parent_id,d.uploaded_by FROM public.drive_items d JOIN ancestry a ON d.id=a.parent_id)
 SELECT public.office_role() IS NOT NULL AND (public.office_role()='Admin' OR EXISTS(SELECT 1 FROM ancestry a WHERE a.uploaded_by=auth.uid() OR EXISTS(SELECT 1 FROM public.shared_access s WHERE s.item_id=a.id AND s.user_id=auth.uid() AND s.permission='manage'))) $$;
CREATE FUNCTION public.drive_is_public(i uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH RECURSIVE ancestry AS (SELECT id,parent_id,uploaded_by,is_public FROM public.drive_items WHERE id=i UNION SELECT d.id,d.parent_id,d.uploaded_by,d.is_public FROM public.drive_items d JOIN ancestry a ON d.id=a.parent_id)
 SELECT EXISTS(SELECT 1 FROM ancestry a JOIN public.users u ON u.id=a.uploaded_by WHERE a.is_public AND u.active) $$;
CREATE FUNCTION public.protect_drive_item() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 BEGIN
 IF auth.uid() IS NOT NULL AND TG_OP='UPDATE' THEN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by OR NEW.type IS DISTINCT FROM OLD.type OR NEW.storage_path IS DISTINCT FROM OLD.storage_path THEN RAISE EXCEPTION 'File identity cannot change'; END IF;
  IF NEW.is_public IS DISTINCT FROM OLD.is_public AND NOT public.can_manage_drive(OLD.id) THEN RAISE EXCEPTION 'Sharing requires manage permission'; END IF;
 END IF;
 IF NEW.parent_id IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM public.drive_items WHERE id=NEW.parent_id AND type='folder') THEN RAISE EXCEPTION 'Parent must be a folder'; END IF;
  IF (TG_OP='INSERT' OR NEW.parent_id IS DISTINCT FROM OLD.parent_id) AND auth.uid() IS NOT NULL AND NOT public.can_drive(NEW.parent_id,true) THEN RAISE EXCEPTION 'Destination folder is not writable'; END IF;
  IF EXISTS(WITH RECURSIVE parents AS (SELECT id,parent_id FROM public.drive_items WHERE id=NEW.parent_id UNION SELECT d.id,d.parent_id FROM public.drive_items d JOIN parents p ON d.id=p.parent_id) SELECT 1 FROM parents WHERE id=NEW.id) THEN RAISE EXCEPTION 'Cannot move folder into itself'; END IF;
 END IF;
 IF NEW.type='folder' AND NEW.storage_path IS NOT NULL THEN RAISE EXCEPTION 'Folder cannot contain a storage path'; END IF;
 IF NEW.type='file' AND (NEW.storage_path IS NULL OR (TG_OP='INSERT' AND auth.uid() IS NOT NULL AND NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='drive-files' AND name=NEW.storage_path AND owner_id=NEW.uploaded_by::text))) THEN RAISE EXCEPTION 'Storage object must belong to the uploader'; END IF;
 RETURN NEW;
 END $$;
CREATE TRIGGER drive_item_integrity BEFORE INSERT OR UPDATE ON public.drive_items FOR EACH ROW EXECUTE FUNCTION public.protect_drive_item();
ALTER POLICY shares_create ON public.shared_access WITH CHECK(shared_by=auth.uid() AND public.can_manage_drive(item_id));
ALTER POLICY shares_edit ON public.shared_access USING(public.can_manage_drive(item_id)) WITH CHECK(public.can_manage_drive(item_id));
ALTER POLICY shares_delete ON public.shared_access USING(public.can_manage_drive(item_id));
REVOKE EXECUTE ON FUNCTION public.can_manage_drive(uuid),public.drive_is_public(uuid),public.protect_drive_item() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_drive(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.drive_is_public(uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
