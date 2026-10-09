BEGIN;
CREATE FUNCTION public.sorted_room_members(members uuid[]) RETURNS uuid[] LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT array_agg(member ORDER BY member) FROM unnest(members) AS member $$;
ALTER TABLE public.chat_rooms ADD CONSTRAINT dm_has_two_members CHECK(type<>'dm' OR (cardinality(participants)=2 AND participants[1]<>participants[2]));
CREATE UNIQUE INDEX chat_dm_unique ON public.chat_rooms(public.sorted_room_members(participants)) WHERE type='dm';
CREATE OR REPLACE FUNCTION public.protect_room_members() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF current_user='authenticated' THEN
 IF NEW.id<>OLD.id OR NEW.type<>OLD.type OR NEW.sector IS DISTINCT FROM OLD.sector OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN RAISE EXCEPTION 'Room identity cannot change'; END IF;
 IF NEW.participants IS DISTINCT FROM OLD.participants AND (OLD.type<>'project' OR auth.uid() IS DISTINCT FROM OLD.created_by) THEN RAISE EXCEPTION 'Somente o criador gerencia participantes do projeto'; END IF;
 END IF;RETURN NEW;END $$;
CREATE FUNCTION public.manage_group_member(room_id uuid,member_id uuid,adding boolean) RETURNS public.chat_rooms LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE room public.chat_rooms;BEGIN
 SELECT * INTO room FROM public.chat_rooms WHERE id=room_id FOR UPDATE;
 IF NOT FOUND OR room.type<>'project' OR room.created_by IS DISTINCT FROM auth.uid() OR public.office_role() IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=member_id AND active) THEN RAISE EXCEPTION 'Usuário indisponível'; END IF;
 IF NOT adding AND member_id=room.created_by THEN RAISE EXCEPTION 'O criador não pode ser removido'; END IF;
 IF adding AND NOT member_id=ANY(room.participants) THEN room.participants=array_append(room.participants,member_id); ELSIF NOT adding THEN room.participants=array_remove(room.participants,member_id); END IF;
 UPDATE public.chat_rooms SET participants=room.participants,updated_at=now() WHERE id=room_id RETURNING * INTO room; RETURN room;END $$;
REVOKE EXECUTE ON FUNCTION public.manage_group_member(uuid,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_group_member(uuid,uuid,boolean) TO authenticated;
COMMIT;
