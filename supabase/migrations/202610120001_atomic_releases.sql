BEGIN;

ALTER TABLE public.releases ADD COLUMN release_at timestamptz;
ALTER TABLE public.calendar_events ADD COLUMN generated_by_release boolean NOT NULL DEFAULT false;
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_generated_release_link
  CHECK (NOT generated_by_release OR (linked_release_id IS NOT NULL AND NOT generated_by_task));
CREATE UNIQUE INDEX calendar_one_generated_release ON public.calendar_events(linked_release_id) WHERE generated_by_release;
-- A manually linked meeting survives deletion of its release.
ALTER TABLE public.calendar_events DROP CONSTRAINT calendar_events_linked_release_id_fkey;
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_linked_release_id_fkey
  FOREIGN KEY (linked_release_id) REFERENCES public.releases(id) ON DELETE SET NULL;
CREATE POLICY calendar_manual_release_create ON public.calendar_events AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT generated_by_release);
CREATE POLICY calendar_manual_release_edit ON public.calendar_events AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT generated_by_release) WITH CHECK (NOT generated_by_release);
CREATE POLICY calendar_manual_release_delete ON public.calendar_events AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT generated_by_release);

CREATE FUNCTION public.release_clock_changed() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF NEW.release_date IS NULL THEN
    NEW.release_at=NULL;
  ELSIF NEW.release_at IS NULL OR (TG_OP='UPDATE' AND NEW.release_date IS DISTINCT FROM OLD.release_date AND NEW.release_at IS NOT DISTINCT FROM OLD.release_at) THEN
    NEW.release_at=(NEW.release_date+time '12:00') AT TIME ZONE 'America/Sao_Paulo';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.release_clock_changed() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER release_clock BEFORE INSERT OR UPDATE OF release_date,release_at ON public.releases
  FOR EACH ROW EXECUTE FUNCTION public.release_clock_changed();

CREATE FUNCTION public.sync_release_calendar(release_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.releases; starts timestamptz;
BEGIN
  SELECT * INTO r FROM public.releases WHERE id=release_id;
  IF NOT FOUND OR r.release_date IS NULL OR r.created_by IS NULL THEN
    DELETE FROM public.calendar_events WHERE linked_release_id=release_id AND generated_by_release;
    RETURN;
  END IF;
  starts=coalesce(r.release_at,(r.release_date+time '12:00') AT TIME ZONE 'America/Sao_Paulo');
  INSERT INTO public.calendar_events(title,description,start_time,end_time,type,sector,created_by,linked_release_id,generated_by_release)
    VALUES(r.artist||' - '||r.title,'Lançamento: '||upper(r.release_type)||coalesce(' | '||nullif(r.genre,''),''),
      starts,starts+interval '1 hour','company',r.sector::public.sector_type,r.created_by,r.id,true)
    ON CONFLICT (linked_release_id) WHERE generated_by_release DO UPDATE SET
      title=EXCLUDED.title,description=EXCLUDED.description,start_time=EXCLUDED.start_time,
      end_time=EXCLUDED.end_time,sector=EXCLUDED.sector,created_by=EXCLUDED.created_by
      WHERE (calendar_events.title,calendar_events.description,calendar_events.start_time,calendar_events.end_time,calendar_events.sector,calendar_events.created_by)
        IS DISTINCT FROM (EXCLUDED.title,EXCLUDED.description,EXCLUDED.start_time,EXCLUDED.end_time,EXCLUDED.sector,EXCLUDED.created_by);
END $$;
REVOKE ALL ON FUNCTION public.sync_release_calendar(uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.release_calendar_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    -- Delete generated rows before the FK unlinks surviving manual meetings.
    DELETE FROM public.calendar_events WHERE linked_release_id=OLD.id AND generated_by_release;
    RETURN OLD;
  END IF;
  PERFORM public.sync_release_calendar(NEW.id);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.release_calendar_changed() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER release_calendar AFTER INSERT OR UPDATE OF title,artist,release_type,genre,sector,release_date,release_at,created_by ON public.releases
  FOR EACH ROW EXECUTE FUNCTION public.release_calendar_changed();
CREATE TRIGGER release_calendar_delete BEFORE DELETE ON public.releases
  FOR EACH ROW EXECUTE FUNCTION public.release_calendar_changed();

-- Invoker security preserves active-user, MFA and ownership policies.
CREATE FUNCTION public.save_office_release(release_id uuid, changes jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE r public.releases; next_position integer;
BEGIN
  IF public.office_role() IS NULL THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
  IF changes IS NULL OR jsonb_typeof(changes)<>'object' THEN RAISE EXCEPTION 'Dados inválidos'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(changes) k WHERE k NOT IN
    ('title','artist','artists','release_type','genre','release_date','release_at','status','cover_url','wav_url',
     'composers','tracks','platform_links','isrc','upc','label','distributor','notes','sector','position')) THEN
    RAISE EXCEPTION 'Campo de lançamento inválido';
  END IF;
  IF release_id IS NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(712012001);
    SELECT coalesce(max(position),-1)+1 INTO next_position FROM public.releases WHERE status=coalesce(changes->>'status','scheduled');
    SELECT * INTO r FROM jsonb_populate_record(NULL::public.releases,
      jsonb_build_object('status','scheduled','position',next_position,'artists','[]'::jsonb,'composers','[]'::jsonb,
        'tracks','[]'::jsonb,'platform_links','[]'::jsonb)||changes);
    INSERT INTO public.releases(title,artist,artists,release_type,genre,release_date,release_at,status,cover_url,wav_url,
      composers,tracks,platform_links,isrc,upc,label,distributor,notes,sector,position,created_by)
    VALUES(r.title,r.artist,r.artists,r.release_type,r.genre,r.release_date,r.release_at,r.status,r.cover_url,r.wav_url,
      r.composers,r.tracks,r.platform_links,r.isrc,r.upc,r.label,r.distributor,r.notes,r.sector,r.position,auth.uid()) RETURNING * INTO r;
  ELSE
    SELECT * INTO r FROM public.releases WHERE id=release_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Lançamento indisponível' USING ERRCODE='42501'; END IF;
    SELECT * INTO r FROM jsonb_populate_record(r,changes);
    UPDATE public.releases SET title=r.title,artist=r.artist,artists=r.artists,release_type=r.release_type,
      genre=r.genre,release_date=r.release_date,release_at=r.release_at,status=r.status,cover_url=r.cover_url,wav_url=r.wav_url,
      composers=r.composers,tracks=r.tracks,platform_links=r.platform_links,isrc=r.isrc,upc=r.upc,label=r.label,
      distributor=r.distributor,notes=r.notes,sector=r.sector,position=r.position
      WHERE id=release_id RETURNING * INTO r;
    IF NOT FOUND THEN RAISE EXCEPTION 'Lançamento indisponível' USING ERRCODE='42501'; END IF;
  END IF;
  IF nullif(trim(r.title),'') IS NULL OR nullif(trim(r.artist),'') IS NULL THEN RAISE EXCEPTION 'Informe título e artista'; END IF;
  RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.save_office_release(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_office_release(uuid,jsonb) TO authenticated;

UPDATE public.releases SET release_at=(release_date+time '12:00') AT TIME ZONE 'America/Sao_Paulo' WHERE release_date IS NOT NULL;
NOTIFY pgrst,'reload schema';
COMMIT;
