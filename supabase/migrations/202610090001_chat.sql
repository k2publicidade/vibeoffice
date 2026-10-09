BEGIN;
INSERT INTO storage.buckets(id,name,public,file_size_limit) VALUES('message-assets','message-assets',false,52428800);
CREATE FUNCTION public.can_message_asset(path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.chat_rooms WHERE id::text=split_part(path,'/',1) AND public.can_room(id));
$$;
REVOKE ALL ON FUNCTION public.can_message_asset(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_message_asset(text) TO authenticated;
CREATE POLICY message_files_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='message-assets' AND public.can_message_asset(name));
CREATE POLICY message_files_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='message-assets' AND public.can_message_asset(name));
CREATE POLICY message_files_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='message-assets' AND owner_id=auth.uid()::text AND public.can_message_asset(name));
CREATE FUNCTION public.chat_room_summaries() RETURNS TABLE(room_id uuid,content text,"timestamp" timestamptz,unread bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT room.id, CASE WHEN last_message.type='text' THEN last_message.content ELSE 'Anexo' END,last_message.timestamp,
 (SELECT count(*) FROM public.messages m WHERE m.room_id=room.id AND m.user_id<>auth.uid() AND NOT(m.read_by ? auth.uid()::text))
 FROM public.chat_rooms room JOIN LATERAL(SELECT m.content,m.timestamp,m.type FROM public.messages m WHERE m.room_id=room.id ORDER BY m.timestamp DESC LIMIT 1) last_message ON true
 WHERE public.can_room(room.id) AND public.office_role() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.chat_room_summaries() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.chat_room_summaries() TO authenticated;
COMMIT;
