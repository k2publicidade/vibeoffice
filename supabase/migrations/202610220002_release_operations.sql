BEGIN;
CREATE TABLE public.release_distribution (
 release_id uuid PRIMARY KEY REFERENCES public.releases(id) ON DELETE CASCADE,
 stage text NOT NULL DEFAULT 'draft' CHECK(stage IN ('draft','in_review','changes_requested','approved','submitted','live')),
 notes text NOT NULL DEFAULT '' CHECK(length(notes)<=4000),
 rights_confirmed boolean NOT NULL DEFAULT false,
 revelator_release_id text CHECK(revelator_release_id ~ '^[0-9]{1,18}$'),
 revelator_url text,
 stores text[] NOT NULL DEFAULT '{}',
 revision integer NOT NULL DEFAULT 0,
 approved_fingerprint text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.release_distribution_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 release_id uuid NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
 actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
 actor_name text NOT NULL,
 action text NOT NULL,
 from_stage text NOT NULL,
 to_stage text NOT NULL,
 notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.release_performance (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 release_id uuid NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
 month text NOT NULL CHECK(month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
 platform text NOT NULL CHECK(length(btrim(platform)) BETWEEN 1 AND 100),
 country text NOT NULL CHECK(country ~ '^[A-Z]{2}$'),
 streams bigint NOT NULL CHECK(streams BETWEEN 0 AND 1000000000000),
 revenue numeric(24,8) NOT NULL CHECK(abs(revenue)<=1000000000000),
 currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 source_name text NOT NULL CHECK(length(source_name) BETWEEN 1 AND 200),
 imported_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
 imported_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(release_id,month,platform,country,currency)
);
CREATE INDEX release_history_order ON public.release_distribution_history(release_id,created_at DESC);
CREATE INDEX release_performance_period ON public.release_performance(release_id,month);
ALTER TABLE public.release_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_distribution_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY distribution_read ON public.release_distribution FOR SELECT TO authenticated USING(public.office_role() IS NOT NULL AND (public.office_staff() OR EXISTS(SELECT 1 FROM public.releases r WHERE r.id=release_id AND r.created_by=auth.uid())));
CREATE POLICY distribution_history_read ON public.release_distribution_history FOR SELECT TO authenticated USING(public.office_role() IS NOT NULL AND (public.office_staff() OR EXISTS(SELECT 1 FROM public.releases r WHERE r.id=release_id AND r.created_by=auth.uid())));
CREATE POLICY performance_staff_read ON public.release_performance FOR SELECT TO authenticated USING(public.office_staff());
REVOKE ALL ON public.release_distribution,public.release_distribution_history,public.release_performance FROM anon,authenticated;
GRANT SELECT ON public.release_distribution,public.release_distribution_history,public.release_performance TO authenticated;

CREATE FUNCTION public.release_distribution_fingerprint(r public.releases) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT md5(jsonb_build_object('title',r.title,'artist',r.artist,'artists',r.artists,'type',r.release_type,'genre',r.genre,
 'date',r.release_date,'at',r.release_at,'cover',r.cover_url,'audio',r.wav_url,'composers',r.composers,'tracks',r.tracks,'isrc',r.isrc,'upc',r.upc,'label',r.label)::text);
$$;
CREATE FUNCTION public.release_operations_snapshot() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE staff boolean;
BEGIN
 IF public.office_role() IS NULL THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
 staff=public.office_staff();
 RETURN jsonb_build_object(
 'workflows',coalesce((SELECT jsonb_agg(to_jsonb(w)) FROM public.release_distribution w JOIN public.releases r ON r.id=w.release_id WHERE staff OR r.created_by=auth.uid()),'[]'::jsonb),
 'history',coalesce((SELECT jsonb_agg(to_jsonb(h) ORDER BY h.created_at DESC) FROM public.release_distribution_history h JOIN public.releases r ON r.id=h.release_id WHERE staff OR r.created_by=auth.uid()),'[]'::jsonb),
 'metrics',coalesce((SELECT jsonb_agg((to_jsonb(m)-'imported_by'-'revenue') || jsonb_build_object('revenue',CASE WHEN staff THEN m.revenue ELSE NULL END)) FROM public.release_performance m JOIN public.releases r ON r.id=m.release_id WHERE staff OR r.created_by=auth.uid()),'[]'::jsonb),
 'canManage',staff);
END $$;

CREATE FUNCTION public.change_release_distribution(p_release_id uuid,p_action text,p_payload jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.releases; w public.release_distribution; next_stage text; who text; staff boolean; note text; candidate_id text; candidate_url text; check_ok boolean;
BEGIN
 IF public.office_role() IS NULL THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
 staff=public.office_staff();
 SELECT * INTO r FROM public.releases WHERE id=p_release_id FOR UPDATE;
 IF NOT FOUND OR NOT(staff OR r.created_by=auth.uid()) THEN RAISE EXCEPTION 'Lançamento indisponível' USING ERRCODE='42501'; END IF;
 INSERT INTO public.release_distribution(release_id) VALUES(p_release_id) ON CONFLICT DO NOTHING;
 SELECT * INTO w FROM public.release_distribution WHERE release_id=p_release_id FOR UPDATE;
 IF p_payload->>'revision' IS NULL OR (p_payload->>'revision')::integer<>w.revision THEN RAISE EXCEPTION 'O lançamento mudou. Atualize antes de continuar.' USING ERRCODE='40001'; END IF;
 note=coalesce(p_payload->>'notes','');
 IF length(note)>4000 THEN RAISE EXCEPTION 'Observação muito longa'; END IF;
 IF p_action IN ('submit_review','approve') THEN
  check_ok=length(btrim(r.title))>0 AND length(btrim(r.artist))>0 AND r.release_date IS NOT NULL
   AND nullif(btrim(r.cover_url),'') IS NOT NULL AND nullif(btrim(r.wav_url),'') IS NOT NULL AND coalesce(r.upc,'') ~ '^[0-9]{12,13}$';
  IF r.release_type='single' THEN
   check_ok=check_ok AND coalesce(r.isrc,'') ~ '^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$' AND jsonb_array_length(coalesce(r.composers,'[]'))>0
    AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(r.composers,'[]')) c WHERE nullif(btrim(c->>'name'),'') IS NULL);
  ELSE
   check_ok=check_ok AND jsonb_array_length(coalesce(r.tracks,'[]'))>0 AND NOT EXISTS(
    SELECT 1 FROM jsonb_array_elements(coalesce(r.tracks,'[]')) t WHERE nullif(btrim(t->>'title'),'') IS NULL
    OR coalesce(t->>'isrc','') !~ '^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$' OR jsonb_array_length(coalesce(t->'composers','[]'))=0
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(t->'composers','[]')) c WHERE nullif(btrim(c->>'name'),'') IS NULL));
  END IF;
  IF NOT coalesce(check_ok,false) THEN RAISE EXCEPTION 'Complete os metadados, códigos, compositores, capa e áudio antes da revisão.'; END IF;
 END IF;
 CASE p_action
 WHEN 'submit_review' THEN
  IF w.stage NOT IN ('draft','changes_requested') THEN RAISE EXCEPTION 'Etapa incompatível com envio para análise'; END IF;
  IF coalesce((p_payload->>'rights_confirmed')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'Confirme a autorização de uso dos direitos'; END IF;
  w.rights_confirmed=true; next_stage='in_review';
 WHEN 'request_changes' THEN
  IF NOT staff OR w.stage NOT IN ('in_review','approved') THEN RAISE EXCEPTION 'Somente a equipe revisora pode devolver esta análise' USING ERRCODE='42501'; END IF;
  IF length(btrim(note))=0 THEN RAISE EXCEPTION 'Descreva os ajustes necessários'; END IF;
  next_stage='changes_requested';w.approved_fingerprint=null;
 WHEN 'approve' THEN
  IF NOT staff OR w.stage<>'in_review' THEN RAISE EXCEPTION 'Somente a equipe revisora pode aprovar uma análise pendente' USING ERRCODE='42501'; END IF;
  IF NOT w.rights_confirmed THEN RAISE EXCEPTION 'Direitos não confirmados'; END IF;
  w.approved_fingerprint=public.release_distribution_fingerprint(r);next_stage='approved';
 WHEN 'record_submission' THEN
  IF NOT staff OR w.stage<>'approved' THEN RAISE EXCEPTION 'Aprovação necessária antes do registro de envio' USING ERRCODE='42501'; END IF;
  IF w.approved_fingerprint IS DISTINCT FROM public.release_distribution_fingerprint(r) THEN RAISE EXCEPTION 'Metadados mudaram. Solicite nova análise.'; END IF;
  candidate_id=p_payload->>'revelator_release_id';candidate_url=nullif(p_payload->>'revelator_url','');
  IF candidate_id IS NULL OR candidate_id !~ '^[0-9]{1,18}$' THEN RAISE EXCEPTION 'Informe o ID do lançamento na Revelator'; END IF;
  IF candidate_url IS NOT NULL AND candidate_url !~ '^https://[a-zA-Z0-9-]+\.revelator\.pro(/[^[:space:]]*)?$' THEN RAISE EXCEPTION 'Link deve pertencer ao painel Revelator'; END IF;
  IF jsonb_typeof(p_payload->'stores') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'stores') NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Informe as plataformas do envio'; END IF;
  SELECT array_agg(btrim(s)) INTO w.stores FROM jsonb_array_elements_text(p_payload->'stores') s WHERE length(btrim(s)) BETWEEN 1 AND 100;
  IF cardinality(w.stores) IS DISTINCT FROM jsonb_array_length(p_payload->'stores') THEN RAISE EXCEPTION 'Plataformas inválidas'; END IF;
  w.revelator_release_id=candidate_id;w.revelator_url=candidate_url;next_stage='submitted';
 WHEN 'mark_live' THEN
  IF NOT staff OR w.stage<>'submitted' THEN RAISE EXCEPTION 'Apenas envios registrados podem ser confirmados como publicados' USING ERRCODE='42501'; END IF;
  IF length(btrim(note))=0 THEN RAISE EXCEPTION 'Registre como a publicação foi confirmada'; END IF;
  next_stage='live';
  UPDATE public.releases SET status='released' WHERE id=p_release_id;
 WHEN 'reopen' THEN
  IF NOT staff THEN RAISE EXCEPTION 'Apenas a equipe revisora pode reabrir' USING ERRCODE='42501'; END IF;
  IF length(btrim(note))=0 THEN RAISE EXCEPTION 'Informe o motivo da reabertura'; END IF;
  next_stage='draft';w.rights_confirmed=false;w.approved_fingerprint=null;
 ELSE RAISE EXCEPTION 'Ação inválida';
 END CASE;
 SELECT name INTO who FROM public.users WHERE id=auth.uid();
 INSERT INTO public.release_distribution_history(release_id,actor_id,actor_name,action,from_stage,to_stage,notes)
 VALUES(p_release_id,auth.uid(),coalesce(who,'Equipe'),p_action,w.stage,next_stage,note);
 UPDATE public.release_distribution SET stage=next_stage,notes=note,rights_confirmed=w.rights_confirmed,revelator_release_id=w.revelator_release_id,
 revelator_url=w.revelator_url,stores=w.stores,approved_fingerprint=w.approved_fingerprint,revision=revision+1,updated_at=now() WHERE release_id=p_release_id RETURNING * INTO w;
 RETURN to_jsonb(w);
END $$;

CREATE FUNCTION public.invalidate_release_distribution() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_stage text;
BEGIN
 IF public.release_distribution_fingerprint(OLD) IS DISTINCT FROM public.release_distribution_fingerprint(NEW) THEN
  SELECT stage INTO old_stage FROM public.release_distribution WHERE release_id=NEW.id FOR UPDATE;
  IF old_stage IN ('in_review','approved') THEN
   UPDATE public.release_distribution SET stage='draft',rights_confirmed=false,approved_fingerprint=null,revision=revision+1,updated_at=now(),notes='Metadados alterados; envie para nova análise.' WHERE release_id=NEW.id;
   INSERT INTO public.release_distribution_history(release_id,actor_id,actor_name,action,from_stage,to_stage,notes)
   VALUES(NEW.id,auth.uid(),coalesce((SELECT name FROM public.users WHERE id=auth.uid()),'Sistema'),'metadata_changed',old_stage,'draft','Metadados alterados; aprovação anterior invalidada.');
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER release_distribution_invalidate BEFORE UPDATE ON public.releases FOR EACH ROW EXECUTE FUNCTION public.invalidate_release_distribution();

CREATE FUNCTION public.import_release_performance(p_release_id uuid,p_rows jsonb,p_source text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.releases; entry jsonb; months text[]; inserted integer;
BEGIN
 IF NOT coalesce(public.office_staff(),false) THEN RAISE EXCEPTION 'Somente Admin e Gerente podem importar relatórios' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.releases WHERE id=p_release_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lançamento indisponível'; END IF;
 IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Relatório deve conter de 1 a 5.000 linhas'; END IF;
 IF p_source IS NULL OR length(btrim(p_source)) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Nome de relatório inválido'; END IF;
 FOR entry IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  IF entry->>'month' IS NULL OR entry->>'month' !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' OR length(btrim(coalesce(entry->>'platform',''))) NOT BETWEEN 1 AND 100
   OR coalesce(entry->>'country','') !~ '^[A-Z]{2}$' OR coalesce(entry->>'currency','') !~ '^[A-Z]{3}$'
   OR coalesce(entry->>'streams','') !~ '^[0-9]+$' OR (entry->>'streams')::numeric>1000000000000
   OR entry->>'revenue' IS NULL OR abs((entry->>'revenue')::numeric)>1000000000000 THEN RAISE EXCEPTION 'Linha de relatório inválida'; END IF;
  IF nullif(entry->>'upc','') IS NOT NULL AND entry->>'upc' IS DISTINCT FROM r.upc THEN RAISE EXCEPTION 'UPC do relatório não corresponde ao lançamento selecionado'; END IF;
 END LOOP;
 SELECT array_agg(DISTINCT value->>'month') INTO months FROM jsonb_array_elements(p_rows);
 DELETE FROM public.release_performance WHERE release_id=p_release_id AND month=ANY(months);
 INSERT INTO public.release_performance(release_id,month,platform,country,streams,revenue,currency,source_name,imported_by)
 SELECT p_release_id,value->>'month',btrim(value->>'platform'),value->>'country',sum((value->>'streams')::bigint),sum((value->>'revenue')::numeric),value->>'currency',p_source,auth.uid()
 FROM jsonb_array_elements(p_rows) GROUP BY value->>'month',btrim(value->>'platform'),value->>'country',value->>'currency';
 GET DIAGNOSTICS inserted=ROW_COUNT;
 RETURN jsonb_build_object('rows',inserted,'months',months);
END $$;
REVOKE ALL ON FUNCTION public.release_distribution_fingerprint(public.releases),public.invalidate_release_distribution(),public.release_operations_snapshot(),public.change_release_distribution(uuid,text,jsonb),public.import_release_performance(uuid,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_operations_snapshot(),public.change_release_distribution(uuid,text,jsonb),public.import_release_performance(uuid,jsonb,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
