BEGIN;

CREATE TABLE public.drive_uploads (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  storage_path text NOT NULL UNIQUE,
  parent_id uuid,
  name text NOT NULL,
  size bigint NOT NULL CHECK(size>=0),
  mime_type text NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK(state IN('pending','committed','aborted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '2 hours',
  finished_at timestamptz
);
ALTER TABLE public.drive_uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.drive_uploads FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.drive_uploads TO service_role;
CREATE INDEX drive_uploads_expiration ON public.drive_uploads(expires_at) WHERE state='pending';

CREATE FUNCTION public.drive_upload_receipt(upload_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT jsonb_build_object('upload_id',u.id,'storage_path',u.storage_path,'state',u.state,
    'item',CASE WHEN u.state='committed' THEN (SELECT to_jsonb(d) FROM public.drive_items d WHERE d.id=u.id) ELSE NULL END)
    FROM public.drive_uploads u WHERE u.id=upload_id;
$$;
REVOKE ALL ON FUNCTION public.drive_upload_receipt(uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.abort_office_drive_upload(upload_id uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE attempt public.drive_uploads;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(712013001);
  IF public.office_role() IS NULL THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
  SELECT * INTO attempt FROM public.drive_uploads WHERE id=upload_id FOR UPDATE;
  IF NOT FOUND OR attempt.owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Envio indisponível' USING ERRCODE='42501'; END IF;
  -- A lost commit receipt is a success; cancellation never removes a live item.
  IF attempt.state='committed' OR EXISTS(SELECT 1 FROM public.drive_items WHERE storage_path=attempt.storage_path) THEN
    UPDATE public.drive_uploads SET state='committed',finished_at=coalesce(finished_at,now()) WHERE id=upload_id;
  ELSE
    UPDATE public.drive_uploads SET state='aborted',finished_at=coalesce(finished_at,now()) WHERE id=upload_id;
    INSERT INTO public.drive_cleanup_jobs(deletion_id,deleted_item_id,storage_path,requested_by)
      VALUES(attempt.id,attempt.id,attempt.storage_path,attempt.owner_id) ON CONFLICT(storage_path) DO NOTHING;
  END IF;
  RETURN public.drive_upload_receipt(upload_id);
END $$;
REVOKE ALL ON FUNCTION public.abort_office_drive_upload(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.abort_office_drive_upload(uuid) TO authenticated;

CREATE FUNCTION public.begin_office_drive_upload(upload_id uuid,file_name text,file_size bigint,file_mime text,target_parent uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE attempt public.drive_uploads; path text; maximum bigint;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(712013001);
  IF public.office_role() IS NULL THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
  IF upload_id IS NULL OR file_name IS NULL OR btrim(file_name)='' OR file_size IS NULL OR file_size<0 OR file_mime IS NULL OR file_mime='' THEN
    RAISE EXCEPTION 'Dados do envio inválidos' USING ERRCODE='23514';
  END IF;
  SELECT * INTO attempt FROM public.drive_uploads WHERE id=upload_id FOR UPDATE;
  IF FOUND THEN
    IF attempt.owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Envio indisponível' USING ERRCODE='42501'; END IF;
    IF attempt.name IS DISTINCT FROM file_name OR attempt.size IS DISTINCT FROM file_size OR attempt.mime_type IS DISTINCT FROM file_mime OR attempt.parent_id IS DISTINCT FROM target_parent THEN
      RAISE EXCEPTION 'Identificador do envio já utilizado' USING ERRCODE='23514';
    END IF;
    IF attempt.state='pending' AND attempt.expires_at<=clock_timestamp() THEN RETURN public.abort_office_drive_upload(upload_id); END IF;
    RETURN public.drive_upload_receipt(upload_id);
  END IF;
  IF target_parent IS NOT NULL AND (NOT EXISTS(SELECT 1 FROM public.drive_items WHERE id=target_parent AND type='folder') OR NOT public.can_drive(target_parent,true)) THEN
    RAISE EXCEPTION 'Destino indisponível ou sem acesso' USING ERRCODE='42501';
  END IF;
  SELECT file_size_limit INTO maximum FROM storage.buckets WHERE id='drive-files';
  IF maximum IS NOT NULL AND file_size>maximum THEN RAISE EXCEPTION 'Arquivo excede o limite do armazenamento' USING ERRCODE='23514'; END IF;
  path='drive-uploads/'||auth.uid()::text||'/'||upload_id::text;
  IF EXISTS(SELECT 1 FROM public.drive_items WHERE id=upload_id OR storage_path=path)
    OR EXISTS(SELECT 1 FROM public.drive_cleanup_jobs WHERE storage_path=path)
    OR EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='drive-files' AND name=path) THEN
    RAISE EXCEPTION 'Identificador do envio já utilizado' USING ERRCODE='23514';
  END IF;
  INSERT INTO public.drive_uploads(id,owner_id,storage_path,parent_id,name,size,mime_type)
    VALUES(upload_id,auth.uid(),path,target_parent,file_name,file_size,file_mime);
  RETURN public.drive_upload_receipt(upload_id);
END $$;
REVOKE ALL ON FUNCTION public.begin_office_drive_upload(uuid,text,bigint,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.begin_office_drive_upload(uuid,text,bigint,text,uuid) TO authenticated;

CREATE FUNCTION public.can_put_drive_upload(path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT public.office_role() IS NOT NULL AND EXISTS(SELECT 1 FROM public.drive_uploads
    WHERE storage_path=path AND owner_id=auth.uid() AND state='pending' AND expires_at>clock_timestamp());
$$;
REVOKE ALL ON FUNCTION public.can_put_drive_upload(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_put_drive_upload(text) TO authenticated;
CREATE POLICY drive_upload_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK(bucket_id<>'drive-files' OR name NOT LIKE 'drive-uploads/%' OR public.can_put_drive_upload(name));
CREATE POLICY drive_upload_immutable ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
  USING(bucket_id<>'drive-files' OR name NOT LIKE 'drive-uploads/%')
  WITH CHECK(bucket_id<>'drive-files' OR name NOT LIKE 'drive-uploads/%');

CREATE FUNCTION public.guard_drive_upload_identity() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE attempt public.drive_uploads;
BEGIN
  IF NEW.storage_path LIKE 'drive-uploads/%' THEN
    SELECT * INTO attempt FROM public.drive_uploads WHERE storage_path=NEW.storage_path FOR UPDATE;
    IF NOT FOUND OR attempt.state<>'pending' OR attempt.expires_at<=clock_timestamp()
      OR NEW.id IS DISTINCT FROM attempt.id OR NEW.uploaded_by IS DISTINCT FROM attempt.owner_id
      OR NEW.parent_id IS DISTINCT FROM attempt.parent_id OR NEW.name IS DISTINCT FROM attempt.name
      OR NEW.size IS DISTINCT FROM attempt.size OR NEW.mime_type IS DISTINCT FROM attempt.mime_type
      OR NEW.type<>'file' OR NEW.is_public OR NEW.sector IS NOT NULL THEN
      RAISE EXCEPTION 'Metadados não correspondem ao envio reservado' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_drive_upload_identity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER drive_upload_identity_guard BEFORE INSERT ON public.drive_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_drive_upload_identity();

CREATE FUNCTION public.confirm_drive_upload_receipt() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.storage_path LIKE 'drive-uploads/%' THEN
    UPDATE public.drive_uploads SET state='committed',finished_at=now() WHERE id=NEW.id;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.confirm_drive_upload_receipt() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER drive_upload_confirmed AFTER INSERT ON public.drive_items
  FOR EACH ROW EXECUTE FUNCTION public.confirm_drive_upload_receipt();

CREATE FUNCTION public.complete_office_drive_upload(upload_id uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE attempt public.drive_uploads; object_size bigint;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(712013001);
  IF public.office_role() IS NULL THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
  SELECT * INTO attempt FROM public.drive_uploads WHERE id=upload_id FOR UPDATE;
  IF NOT FOUND OR attempt.owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Envio indisponível' USING ERRCODE='42501'; END IF;
  IF attempt.state<>'pending' THEN RETURN public.drive_upload_receipt(upload_id); END IF;
  IF attempt.expires_at<=clock_timestamp() THEN RETURN public.abort_office_drive_upload(upload_id); END IF;
  IF attempt.parent_id IS NOT NULL AND (NOT EXISTS(SELECT 1 FROM public.drive_items WHERE id=attempt.parent_id AND type='folder') OR NOT public.can_drive(attempt.parent_id,true)) THEN
    RAISE EXCEPTION 'Destino indisponível ou sem acesso' USING ERRCODE='42501';
  END IF;
  SELECT (metadata->>'size')::bigint INTO object_size FROM storage.objects
    WHERE bucket_id='drive-files' AND name=attempt.storage_path AND owner_id=attempt.owner_id::text;
  IF NOT FOUND THEN RETURN public.drive_upload_receipt(upload_id); END IF;
  IF object_size IS DISTINCT FROM attempt.size THEN RAISE EXCEPTION 'Tamanho do arquivo não confirmado' USING ERRCODE='23514'; END IF;
  INSERT INTO public.drive_items(id,name,type,parent_id,size,mime_type,storage_path,uploaded_by)
    VALUES(attempt.id,attempt.name,'file',attempt.parent_id,attempt.size,attempt.mime_type,attempt.storage_path,attempt.owner_id);
  RETURN public.drive_upload_receipt(upload_id);
END $$;
REVOKE ALL ON FUNCTION public.complete_office_drive_upload(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_office_drive_upload(uuid) TO authenticated;

CREATE FUNCTION public.expire_drive_uploads() RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE attempt public.drive_uploads; expired integer=0;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(712013001);
  FOR attempt IN SELECT u.* FROM public.drive_uploads u
    WHERE (u.state='pending' AND u.expires_at<=clock_timestamp())
      OR (u.state='aborted' AND EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='drive-files' AND name=u.storage_path))
    ORDER BY u.created_at LIMIT 1000 FOR UPDATE OF u SKIP LOCKED
  LOOP
    IF EXISTS(SELECT 1 FROM public.drive_items WHERE storage_path=attempt.storage_path) THEN
      UPDATE public.drive_uploads SET state='committed',finished_at=coalesce(finished_at,now()) WHERE id=attempt.id;
    ELSE
      UPDATE public.drive_uploads SET state='aborted',finished_at=coalesce(finished_at,now()) WHERE id=attempt.id;
      INSERT INTO public.drive_cleanup_jobs(deletion_id,deleted_item_id,storage_path,requested_by)
        VALUES(attempt.id,attempt.id,attempt.storage_path,attempt.owner_id)
        ON CONFLICT(storage_path) DO UPDATE SET completed_at=NULL,next_attempt_at=now(),last_error=NULL,locked_until=NULL,claim_token=NULL
          WHERE drive_cleanup_jobs.completed_at IS NOT NULL;
      expired=expired+1;
    END IF;
  END LOOP;
  -- Retain receipts/tombstones long enough for retries and late provider writes.
  DELETE FROM public.drive_uploads WHERE finished_at<now()-interval '30 days'
    AND (state='committed' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='drive-files' AND name=drive_uploads.storage_path));
  RETURN expired;
END $$;
REVOKE ALL ON FUNCTION public.expire_drive_uploads() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.expire_drive_uploads() TO service_role;

SELECT cron.schedule('office-drive-cleanup','*/10 * * * *',$job$
  SELECT public.expire_drive_uploads();
  DELETE FROM public.drive_cleanup_jobs WHERE completed_at<now()-interval '7 days';
  SELECT net.http_post(url:='https://office.vibedistro.com/api/drive/cleanup',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||s.decrypted_secret),body:='{}'::jsonb,timeout_milliseconds:=55000)
    FROM vault.decrypted_secrets s WHERE s.name='office_notification_webhook_secret'
      AND EXISTS(SELECT 1 FROM public.drive_cleanup_jobs WHERE completed_at IS NULL AND next_attempt_at<=now() AND (locked_until IS NULL OR locked_until<now()));
$job$);
NOTIFY pgrst,'reload schema';
COMMIT;
