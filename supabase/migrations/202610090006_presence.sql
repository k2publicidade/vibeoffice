BEGIN;
CREATE OR REPLACE FUNCTION public.can_office_channel(topic text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.office_role() IS NOT NULL AND (topic='office-presence' OR (split_part(topic,':',1)='office-room' AND EXISTS(SELECT 1 FROM public.chat_rooms WHERE id::text=split_part(topic,':',2) AND public.can_room(id))));
$$;
COMMIT;
