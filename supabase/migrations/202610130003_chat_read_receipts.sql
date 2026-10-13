BEGIN;
-- Updated clients need a receipt, rather than treating a void/zero-row RPC as
-- proof that every requested message was marked. Keep the legacy API intact.
CREATE FUNCTION public.mark_office_messages_read(message_ids uuid[]) RETURNS uuid[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid(); message public.messages; confirmed uuid[] := '{}'::uuid[];
BEGIN
  IF public.office_role() IS NULL THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
  IF cardinality(message_ids)>200 THEN RAISE EXCEPTION 'Lote muito grande' USING ERRCODE='22023'; END IF;
  FOR message IN
    SELECT m.* FROM public.messages m
    WHERE m.id=ANY(message_ids) AND m.user_id<>actor AND public.can_room(m.room_id)
    ORDER BY m.id FOR UPDATE OF m
  LOOP
    -- Recheck after waiting for a row lock. Preserve the first read timestamp
    -- so a retry does not trigger another message/room update.
    IF NOT public.can_room(message.room_id) THEN CONTINUE; END IF;
    IF NOT coalesce(message.read_by,'{}'::jsonb) ? actor::text THEN
      UPDATE public.messages SET read_by=coalesce(read_by,'{}'::jsonb) || jsonb_build_object(actor::text,clock_timestamp()) WHERE id=message.id;
    END IF;
    confirmed := array_append(confirmed,message.id);
  END LOOP;
  RETURN confirmed;
END $$;
REVOKE ALL ON FUNCTION public.mark_office_messages_read(uuid[]) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.mark_office_messages_read(uuid[]) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
