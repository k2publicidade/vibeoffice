BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;
ALTER TABLE notifications ADD COLUMN push_sent_at timestamptz, ADD COLUMN email_sent_at timestamptz;
CREATE FUNCTION public.enqueue_notification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE token text; BEGIN
 SELECT decrypted_secret INTO token FROM vault.decrypted_secrets WHERE name='office_notification_webhook_secret' LIMIT 1;
 IF token IS NOT NULL THEN PERFORM net.http_post(url:='https://office.vibedistro.com/api/notifications/deliver',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),body:=jsonb_build_object('id',NEW.id),timeout_milliseconds:=15000); END IF;
 RETURN NEW; END $$;
CREATE TRIGGER enqueue_notification AFTER INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION public.enqueue_notification();
CREATE FUNCTION public.emit_office_notification(recipient uuid,kind text,heading text,body text,entity text,entityid uuid,extra jsonb DEFAULT '{}') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF recipient IS DISTINCT FROM auth.uid() AND EXISTS(SELECT 1 FROM public.users WHERE id=recipient AND active) AND coalesce((SELECT enable_in_app OR enable_push OR enable_email FROM public.notification_preferences WHERE user_id=recipient AND notification_type=kind),true) THEN
 INSERT INTO public.notifications(user_id,type,title,message,entity_type,entity_id,metadata) VALUES(recipient,kind,heading,body,entity,entityid,extra); END IF; END $$;
CREATE FUNCTION public.notify_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE r uuid; BEGIN
 IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='tasks' THEN FOR r IN SELECT user_id FROM public.task_assignees WHERE task_id=NEW.id UNION SELECT NEW.created_by LOOP PERFORM public.emit_office_notification(r,'task_status_changed','Status da tarefa alterado',NEW.title,'task',NEW.id,jsonb_build_object('status',NEW.status)); END LOOP;
 ELSE FOR r IN SELECT NEW.requester UNION SELECT NEW.assigned_to LOOP PERFORM public.emit_office_notification(r,'ticket_status_changed','Status do ticket alterado',NEW.title,'ticket',NEW.id,jsonb_build_object('status',NEW.status)); END LOOP; END IF; RETURN NEW; END $$;
CREATE TRIGGER task_status_notification AFTER UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION public.notify_status();
CREATE TRIGGER ticket_status_notification AFTER UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION public.notify_status();
CREATE FUNCTION public.notify_comment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE t public.tickets;r uuid; BEGIN
 SELECT * INTO t FROM public.tickets WHERE id=NEW.ticket_id;
 FOR r IN SELECT t.requester UNION SELECT t.assigned_to LOOP
 IF NOT NEW.is_internal OR EXISTS(SELECT 1 FROM public.users WHERE id=r AND role IN('Admin','Gerente')) THEN PERFORM public.emit_office_notification(r,'ticket_comment_added','Novo comentário no ticket',left(NEW.content,200),'ticket',t.id); END IF; END LOOP;
 IF t.linked_task_id IS NOT NULL AND NOT NEW.is_internal THEN FOR r IN SELECT user_id FROM public.task_assignees WHERE task_id=t.linked_task_id LOOP PERFORM public.emit_office_notification(r,'task_comment_added','Novo comentário na tarefa',left(NEW.content,200),'task',t.linked_task_id); END LOOP; END IF; RETURN NEW; END $$;
CREATE TRIGGER comment_notification AFTER INSERT ON ticket_comments FOR EACH ROW EXECUTE FUNCTION public.notify_comment();
CREATE FUNCTION public.notify_new_ticket() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE r uuid;BEGIN
 FOR r IN SELECT id FROM public.users WHERE active AND role IN('Admin','Gerente') LOOP PERFORM public.emit_office_notification(r,'ticket_created','Novo ticket',NEW.title,'ticket',NEW.id); END LOOP; RETURN NEW; END $$;
CREATE TRIGGER new_ticket_notification AFTER INSERT ON tickets FOR EACH ROW EXECUTE FUNCTION public.notify_new_ticket();
CREATE FUNCTION public.notify_announcement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE r uuid;BEGIN
 IF NOT NEW.active OR NEW.expires_at<=now() THEN RETURN NEW; END IF;
 FOR r IN SELECT id FROM public.users WHERE active AND (cardinality(NEW.target_sectors)=0 OR sector=ANY(NEW.target_sectors)) LOOP PERFORM public.emit_office_notification(r,'announcement',NEW.title,NEW.message,NULL,NEW.id); END LOOP;RETURN NEW;END $$;
CREATE TRIGGER announcement_notification AFTER INSERT ON company_announcements FOR EACH ROW EXECUTE FUNCTION public.notify_announcement();
CREATE OR REPLACE FUNCTION public.notify_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE r record;BEGIN
 UPDATE public.chat_rooms SET updated_at=now() WHERE id=NEW.room_id;
 FOR r IN SELECT u.id FROM public.users u JOIN public.chat_rooms room ON room.id=NEW.room_id WHERE u.active AND u.id<>NEW.user_id AND (u.id=ANY(room.participants) OR (room.type='sector' AND room.sector=u.sector)) LOOP
 PERFORM public.emit_office_notification(r.id,CASE WHEN r.id::text=ANY(NEW.mentioned_users) THEN 'mentioned_in_chat' ELSE 'message_received' END,CASE WHEN r.id::text=ANY(NEW.mentioned_users) THEN 'Você foi mencionado' ELSE 'Nova mensagem' END,left(NEW.content,200),'message',NEW.id,jsonb_build_object('roomId',NEW.room_id));END LOOP;RETURN NEW;END $$;
SELECT cron.schedule('office-due-soon','0 * * * *', $job$
 INSERT INTO public.notifications(user_id,type,title,message,entity_type,entity_id)
 SELECT a.user_id,'task_due_soon','Tarefa vence em breve',t.title,'task',t.id FROM public.tasks t JOIN public.task_assignees a ON a.task_id=t.id
 WHERE t.status<>'done' AND t.due_date>now() AND t.due_date<=now()+interval '24 hours' AND NOT EXISTS(SELECT 1 FROM public.notifications n WHERE n.user_id=a.user_id AND n.entity_id=t.id AND n.type='task_due_soon' AND n.created_at>now()-interval '24 hours')
 AND coalesce((SELECT p.enable_in_app OR p.enable_push OR p.enable_email FROM public.notification_preferences p WHERE p.user_id=a.user_id AND p.notification_type='task_due_soon'),true)
 $job$);
REVOKE EXECUTE ON FUNCTION public.enqueue_notification(),public.emit_office_notification(uuid,text,text,text,text,uuid,jsonb),public.notify_status(),public.notify_comment(),public.notify_new_ticket(),public.notify_announcement() FROM PUBLIC,anon,authenticated;
COMMIT;
