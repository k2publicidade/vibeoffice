BEGIN;
ALTER TABLE public.user_chat_preferences ADD COLUMN is_muted boolean NOT NULL DEFAULT false, ADD COLUMN is_blocked boolean NOT NULL DEFAULT false;
CREATE FUNCTION public.can_send_room(r uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.can_room(r) AND public.office_role() IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.user_chat_preferences p JOIN public.chat_rooms room ON room.id=p.room_id WHERE room.id=r AND room.type='dm' AND p.is_blocked AND p.user_id=ANY(room.participants));
$$;
REVOKE EXECUTE ON FUNCTION public.can_send_room(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_send_room(uuid) TO authenticated;
DROP POLICY messages_create ON public.messages;
CREATE POLICY messages_create ON public.messages FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND public.can_send_room(room_id));
CREATE OR REPLACE FUNCTION public.notify_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE r record;BEGIN
 UPDATE public.chat_rooms SET updated_at=now() WHERE id=NEW.room_id;
 FOR r IN SELECT u.id FROM public.users u JOIN public.chat_rooms room ON room.id=NEW.room_id WHERE u.active AND u.id<>NEW.user_id AND (u.id=ANY(room.participants) OR (room.type='sector' AND room.sector=u.sector)) AND NOT EXISTS(SELECT 1 FROM public.user_chat_preferences p WHERE p.room_id=NEW.room_id AND p.user_id=u.id AND (p.is_muted OR p.is_blocked)) LOOP
 PERFORM public.emit_office_notification(r.id,CASE WHEN r.id::text=ANY(NEW.mentioned_users) THEN 'mentioned_in_chat' ELSE 'message_received' END,CASE WHEN r.id::text=ANY(NEW.mentioned_users) THEN 'Você foi mencionado' ELSE 'Nova mensagem' END,CASE WHEN NEW.type='text' THEN left(NEW.content,200) ELSE 'Novo anexo' END,'message',NEW.id,jsonb_build_object('roomId',NEW.room_id));END LOOP;RETURN NEW;END $$;
CREATE FUNCTION public.can_office_channel(topic text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.office_role() IS NOT NULL AND split_part(topic,':',1)='office-room' AND EXISTS(SELECT 1 FROM public.chat_rooms WHERE id::text=split_part(topic,':',2) AND public.can_room(id));
$$;
REVOKE EXECUTE ON FUNCTION public.can_office_channel(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_office_channel(text) TO authenticated;
CREATE POLICY office_channel_read ON realtime.messages FOR SELECT TO authenticated USING(public.can_office_channel(realtime.topic()));
CREATE POLICY office_channel_send ON realtime.messages FOR INSERT TO authenticated WITH CHECK(public.can_office_channel(realtime.topic()));
COMMIT;
