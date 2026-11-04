-- Keep a record of ticket identities even when a ticket is edited or archived.
ALTER TABLE public.tickets ADD COLUMN archived_at timestamptz;

CREATE TABLE public.ticket_submission_keys (
  fingerprint text PRIMARY KEY
);
ALTER TABLE public.ticket_submission_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ticket_submission_keys FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.ticket_submission_fingerprint(ticket public.tickets)
RETURNS text
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT encode(sha256(convert_to(jsonb_build_array(
    ticket.requester,
    lower(btrim(regexp_replace(ticket.title, '[[:space:]]+', ' ', 'g'))),
    lower(btrim(regexp_replace(
      CASE
        -- The dashboard used to supply this text when the description was empty.
        WHEN ticket.request_type IS NOT NULL AND ticket.description =
          split_part(ticket.title, ': ', 2) || ': ' ||
          to_char(ticket.request_start_date, 'DD/MM/YYYY') || ' a ' ||
          to_char(ticket.request_end_date, 'DD/MM/YYYY')
        THEN ''
        ELSE coalesce(ticket.description, '')
      END, '[[:space:]]+', ' ', 'g'))),
    ticket.category,
    ticket.request_type,
    to_char(ticket.request_start_date, 'YYYY-MM-DD'),
    to_char(ticket.request_end_date, 'YYYY-MM-DD')
  )::text, 'UTF8')), 'hex');
$$;

INSERT INTO public.ticket_submission_keys (fingerprint)
SELECT public.ticket_submission_fingerprint(ticket)
FROM public.tickets AS ticket
ON CONFLICT DO NOTHING;

CREATE FUNCTION public.reserve_ticket_submission()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  submission_key text := public.ticket_submission_fingerprint(NEW);
BEGIN
  IF TG_OP = 'UPDATE' AND submission_key = public.ticket_submission_fingerprint(OLD) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.ticket_submission_keys (fingerprint)
  VALUES (submission_key)
  ON CONFLICT DO NOTHING;

  IF NOT FOUND AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Já existe um ticket igual para este solicitante.'
      USING ERRCODE = '23505', CONSTRAINT = 'ticket_submission_keys_pkey';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_ticket_submission() FROM PUBLIC;
CREATE TRIGGER reserve_ticket_submission
AFTER INSERT OR UPDATE OF requester, title, description, category, request_type, request_start_date, request_end_date
ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.reserve_ticket_submission();
