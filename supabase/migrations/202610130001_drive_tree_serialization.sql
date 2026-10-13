BEGIN;

-- Prevent a write racing the installation/preflight; readers remain available.
LOCK TABLE public.drive_items IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS(
    WITH RECURSIVE ancestry AS (
      SELECT id,parent_id,ARRAY[id] visited,false cycle FROM public.drive_items
      UNION ALL
      SELECT d.id,d.parent_id,a.visited||d.id,d.id=ANY(a.visited)
        FROM public.drive_items d JOIN ancestry a ON d.id=a.parent_id WHERE NOT a.cycle
    ) SELECT 1 FROM ancestry WHERE cycle
  ) THEN RAISE EXCEPTION 'Repair existing Drive folder cycles before migration' USING ERRCODE='23514'; END IF;
END $$;

-- The private version row also forces a serialization failure for stale
-- REPEATABLE READ / SERIALIZABLE snapshots after another tree write commits.
CREATE TABLE public.drive_tree_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  revision bigint NOT NULL DEFAULT 0
);
INSERT INTO public.drive_tree_state(singleton) VALUES(true);
ALTER TABLE public.drive_tree_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.drive_tree_state FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.lock_drive_tree_statement() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(712013001);
  UPDATE public.drive_tree_state SET revision=revision+1 WHERE singleton;
  IF NOT FOUND THEN RAISE EXCEPTION 'Drive tree state unavailable'; END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.lock_drive_tree_statement() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER drive_tree_write_lock BEFORE INSERT OR UPDATE OR DELETE ON public.drive_items
  FOR EACH STATEMENT EXECUTE FUNCTION public.lock_drive_tree_statement();

-- RLS in the outer UPDATE can have an earlier statement snapshot. Recheck the
-- source permission after waiting, before the existing destination/cycle guard.
CREATE FUNCTION public.guard_drive_move_actor() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_drive(OLD.id,true) THEN
    RAISE EXCEPTION 'Item indisponível ou sem acesso' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_drive_move_actor() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER drive_actor_move_guard BEFORE UPDATE OF parent_id ON public.drive_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_drive_move_actor();

-- Take the same lock before the RPC locks a root or collects descendants, so
-- its receipt describes precisely the tree deleted by the cascading DELETE.
CREATE OR REPLACE FUNCTION public.delete_office_drive_item(item_id uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path='' AS $$
DECLARE group_id uuid=gen_random_uuid(); root public.drive_items; deleted_ids uuid[];
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(712013001);
  IF public.office_role() IS NULL THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
  SELECT * INTO root FROM public.drive_items WHERE id=item_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_drive(item_id,true) THEN RAISE EXCEPTION 'Item indisponível ou sem acesso' USING ERRCODE='42501'; END IF;
  WITH RECURSIVE descendants AS (
    SELECT id FROM public.drive_items WHERE id=item_id
    UNION SELECT d.id FROM public.drive_items d JOIN descendants p ON d.parent_id=p.id
  ) SELECT array_agg(id) INTO deleted_ids FROM descendants;
  PERFORM set_config('office.drive_deletion_id',group_id::text,true);
  PERFORM set_config('office.drive_cleanup_count','0',true);
  DELETE FROM public.drive_items WHERE id=item_id RETURNING * INTO root;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item indisponível ou sem acesso' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('deletion_id',group_id,'deleted_ids',deleted_ids,
    'cleanup_count',coalesce(nullif(current_setting('office.drive_cleanup_count',true),''),'0')::integer,'parent_id',root.parent_id);
END $$;
REVOKE ALL ON FUNCTION public.delete_office_drive_item(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_office_drive_item(uuid) TO authenticated;

NOTIFY pgrst,'reload schema';
COMMIT;
