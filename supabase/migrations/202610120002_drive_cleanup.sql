BEGIN;

-- The application metadata and durable cleanup request commit together.
-- Storage objects are removed only through the Storage API by the server worker.
CREATE TABLE public.drive_cleanup_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deletion_id uuid NOT NULL,
  deleted_item_id uuid NOT NULL,
  storage_path text NOT NULL UNIQUE,
  requested_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  claim_token uuid,
  last_error text
);
ALTER TABLE public.drive_cleanup_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.drive_cleanup_jobs FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.drive_cleanup_jobs TO service_role;
CREATE INDEX drive_cleanup_pending ON public.drive_cleanup_jobs(next_attempt_at) WHERE completed_at IS NULL;
CREATE INDEX drive_cleanup_deletion ON public.drive_cleanup_jobs(deletion_id);
CREATE INDEX IF NOT EXISTS drive_items_storage_path_lookup ON public.drive_items(storage_path) WHERE storage_path IS NOT NULL;

-- Old clients cannot destroy a live file before deleting its application record.
CREATE FUNCTION public.can_delete_drive_object(path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT public.office_role() IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM public.drive_items WHERE storage_path=path)
    AND EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='drive-files' AND name=path
      AND (owner_id=auth.uid()::text OR public.office_role()='Admin'));
$$;
REVOKE ALL ON FUNCTION public.can_delete_drive_object(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_delete_drive_object(text) TO authenticated;
CREATE POLICY drive_preserve_live_objects ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
  USING(bucket_id<>'drive-files' OR public.can_delete_drive_object(storage.objects.name));

CREATE FUNCTION public.can_read_drive_object(path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT public.office_role() IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM public.drive_cleanup_jobs WHERE storage_path=path)
    AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='drive-files' AND o.name=path
      AND (o.owner_id=auth.uid()::text OR public.office_role()='Admin'
        OR EXISTS(SELECT 1 FROM public.drive_items d WHERE d.storage_path=path AND public.can_drive(d.id))));
$$;
REVOKE ALL ON FUNCTION public.can_read_drive_object(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_read_drive_object(text) TO authenticated;
CREATE POLICY drive_hide_deleted_objects ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
  USING(bucket_id<>'drive-files' OR public.can_read_drive_object(storage.objects.name));

CREATE FUNCTION public.guard_drive_cleanup_path() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE path text;
BEGIN
  path=CASE WHEN TG_OP='DELETE' THEN OLD.storage_path ELSE NEW.storage_path END;
  IF path IS NOT NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(path,712012002));
    IF TG_OP<>'DELETE' AND EXISTS(SELECT 1 FROM public.drive_cleanup_jobs WHERE storage_path=path) THEN
      RAISE EXCEPTION 'Este caminho de arquivo está reservado para uma exclusão' USING ERRCODE='23514';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_drive_cleanup_path() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER drive_pending_cleanup_guard BEFORE INSERT OR UPDATE OF storage_path OR DELETE ON public.drive_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_drive_cleanup_path();

CREATE FUNCTION public.enqueue_drive_cleanup() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE group_id uuid;
BEGIN
  -- A second live metadata reference keeps the object available.
  IF OLD.type='file' AND OLD.storage_path IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM public.drive_items WHERE storage_path=OLD.storage_path) THEN
    group_id=coalesce(nullif(current_setting('office.drive_deletion_id',true),'')::uuid,OLD.id);
    INSERT INTO public.drive_cleanup_jobs(deletion_id,deleted_item_id,storage_path,requested_by)
      VALUES(group_id,OLD.id,OLD.storage_path,coalesce(auth.uid(),OLD.uploaded_by)) ON CONFLICT(storage_path) DO NOTHING;
    IF FOUND THEN
      PERFORM set_config('office.drive_cleanup_count',(coalesce(nullif(current_setting('office.drive_cleanup_count',true),''),'0')::integer+1)::text,true);
    END IF;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_drive_cleanup() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER drive_cleanup_deleted AFTER DELETE ON public.drive_items
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_drive_cleanup();

CREATE FUNCTION public.delete_office_drive_item(item_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE group_id uuid=gen_random_uuid(); root public.drive_items; deleted_ids uuid[];
BEGIN
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

CREATE FUNCTION public.claim_drive_cleanup(deletion_id uuid DEFAULT NULL) RETURNS SETOF public.drive_cleanup_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  RETURN QUERY
    WITH candidates AS (
      SELECT j.id FROM public.drive_cleanup_jobs j
      WHERE j.completed_at IS NULL AND j.next_attempt_at<=now()
        AND (j.locked_until IS NULL OR j.locked_until<now())
        AND (claim_drive_cleanup.deletion_id IS NULL OR j.deletion_id=claim_drive_cleanup.deletion_id)
        AND NOT EXISTS(SELECT 1 FROM public.drive_items d WHERE d.storage_path=j.storage_path)
      ORDER BY j.created_at LIMIT 1000 FOR UPDATE SKIP LOCKED
    ) UPDATE public.drive_cleanup_jobs j SET locked_until=now()+interval '10 minutes',claim_token=gen_random_uuid(),attempts=j.attempts+1
      FROM candidates c WHERE j.id=c.id RETURNING j.*;
END $$;
REVOKE ALL ON FUNCTION public.claim_drive_cleanup(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_drive_cleanup(uuid) TO service_role;

CREATE FUNCTION public.finish_drive_cleanup(claims jsonb,succeeded boolean) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE claim jsonb; changed integer; total integer=0;
BEGIN
  FOR claim IN SELECT value FROM jsonb_array_elements(claims) LOOP
    UPDATE public.drive_cleanup_jobs SET completed_at=CASE WHEN succeeded THEN now() ELSE NULL END,
      last_error=CASE WHEN succeeded THEN NULL ELSE 'Storage cleanup failed' END,
      next_attempt_at=CASE WHEN succeeded THEN next_attempt_at ELSE now()+make_interval(mins=>least(60,power(2,least(attempts,6))::integer)) END,
      locked_until=NULL,claim_token=NULL
      WHERE id=(claim->>'id')::uuid AND claim_token=(claim->>'claim_token')::uuid AND completed_at IS NULL;
    GET DIAGNOSTICS changed=ROW_COUNT; total=total+changed;
  END LOOP;
  RETURN total;
END $$;
REVOKE ALL ON FUNCTION public.finish_drive_cleanup(jsonb,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_drive_cleanup(jsonb,boolean) TO service_role;

-- Existing scheduler/Vault infrastructure; no new credentials are introduced.
SELECT cron.schedule('office-drive-cleanup','*/10 * * * *',$job$
  DELETE FROM public.drive_cleanup_jobs WHERE completed_at<now()-interval '7 days';
  SELECT net.http_post(url:='https://office.vibedistro.com/api/drive/cleanup',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||s.decrypted_secret),body:='{}'::jsonb,timeout_milliseconds:=55000)
    FROM vault.decrypted_secrets s WHERE s.name='office_notification_webhook_secret'
      AND EXISTS(SELECT 1 FROM public.drive_cleanup_jobs WHERE completed_at IS NULL AND next_attempt_at<=now() AND (locked_until IS NULL OR locked_until<now()));
$job$);
NOTIFY pgrst,'reload schema';
COMMIT;
