BEGIN;
ALTER TABLE public.tickets ADD COLUMN request_decision text NOT NULL DEFAULT 'pending'
  CHECK (request_decision IN ('pending', 'accepted', 'rejected'));
ALTER TABLE public.tickets ADD COLUMN request_responded_by uuid REFERENCES public.users(id),
  ADD COLUMN request_responded_at timestamptz;

-- Keep existing visibility and include the destination department inbox.
CREATE OR REPLACE FUNCTION public.can_ticket(t uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT public.office_role() IS NOT NULL AND EXISTS(SELECT 1 FROM public.tickets WHERE id=t AND (
    public.office_staff() OR requester=auth.uid() OR assigned_to=auth.uid()
    OR (linked_task_id IS NOT NULL AND public.can_task(linked_task_id))
    OR (request_type IS NOT NULL AND category=public.office_sector()::text)))
$$;

CREATE FUNCTION public.guard_request_decision() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    NEW.request_decision := 'pending';
    NEW.request_responded_by := NULL;
    NEW.request_responded_at := NULL;
    RETURN NEW;
  END IF;
  IF OLD.request_type IS NOT NULL AND auth.uid() IS NOT NULL AND
     (NEW.category IS DISTINCT FROM OLD.category OR NEW.requester IS DISTINCT FROM OLD.requester
      OR NEW.request_type IS DISTINCT FROM OLD.request_type) THEN
    RAISE EXCEPTION 'O destino e o solicitante não podem ser alterados após o envio' USING ERRCODE='42501';
  END IF;
  IF NEW.request_decision IS DISTINCT FROM OLD.request_decision THEN
    IF OLD.request_type IS NULL OR OLD.request_decision <> 'pending'
       OR NEW.request_decision NOT IN ('accepted','rejected') THEN
      RAISE EXCEPTION 'Esta solicitação já foi respondida ou é inválida' USING ERRCODE='23514';
    END IF;
    IF auth.uid() IS NULL OR public.office_role() IS NULL OR NOT EXISTS(SELECT 1 FROM public.users u WHERE u.id=auth.uid() AND u.active
      AND (u.role='Admin' OR u.sector::text=OLD.category OR u.id=OLD.assigned_to)) THEN
      RAISE EXCEPTION 'Somente o destinatário pode responder à solicitação' USING ERRCODE='42501';
    END IF;
    NEW.request_responded_by := auth.uid();
    NEW.request_responded_at := now();
    IF NEW.request_decision='accepted' THEN NEW.assigned_to := auth.uid(); END IF;
  ELSE
    NEW.request_responded_by := OLD.request_responded_by;
    NEW.request_responded_at := OLD.request_responded_at;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_request_decision BEFORE INSERT OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.guard_request_decision();

CREATE FUNCTION public.respond_to_request(p_ticket_id uuid, p_decision text) RETURNS public.tickets
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result public.tickets;
BEGIN
  IF p_decision IS NULL OR p_decision NOT IN ('accepted','rejected') THEN
    RAISE EXCEPTION 'Resposta inválida' USING ERRCODE='23514';
  END IF;
  SELECT * INTO result FROM public.tickets WHERE id=p_ticket_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_ticket(p_ticket_id) OR result.request_type IS NULL THEN
    RAISE EXCEPTION 'Solicitação indisponível' USING ERRCODE='42501';
  END IF;
  UPDATE public.tickets SET request_decision=p_decision, updated_at=now()
    WHERE id=p_ticket_id AND request_decision='pending' RETURNING * INTO result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Esta solicitação já foi respondida' USING ERRCODE='23514'; END IF;
  PERFORM public.emit_office_notification(result.requester, 'ticket_status_changed',
    CASE WHEN p_decision='accepted' THEN 'Solicitação aceita' ELSE 'Solicitação recusada' END,
    result.title, 'ticket', result.id, jsonb_build_object('decision',p_decision));
  RETURN result;
END $$;

CREATE FUNCTION public.notify_request_department() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE recipient uuid;
BEGIN
  IF NEW.request_type IS NOT NULL THEN
    FOR recipient IN SELECT id FROM public.users WHERE active AND sector::text=NEW.category AND role NOT IN ('Admin','Gerente') LOOP
      PERFORM public.emit_office_notification(recipient,'ticket_created','Nova solicitação para seu setor',NEW.title,'ticket',NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER notify_request_department AFTER INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_request_department();
REVOKE ALL ON FUNCTION public.guard_request_decision(),public.notify_request_department(),public.respond_to_request(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_request(uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
