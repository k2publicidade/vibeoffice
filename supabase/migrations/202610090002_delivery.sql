BEGIN;
CREATE POLICY office_active_storage ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated USING(public.office_role() IS NOT NULL) WITH CHECK(public.office_role() IS NOT NULL);
CREATE OR REPLACE FUNCTION public.notify_assignment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE recipient uuid;entity uuid;heading text;kind text; BEGIN
 IF TG_TABLE_NAME='task_assignees' THEN recipient=NEW.user_id;entity=NEW.task_id;kind='task_assigned';SELECT title INTO heading FROM public.tasks WHERE id=entity;
 ELSE recipient=NEW.assigned_to;entity=NEW.id;kind='ticket_assigned';heading=NEW.title;IF TG_OP='UPDATE' AND NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN RETURN NEW; END IF; END IF;
 PERFORM public.emit_office_notification(recipient,kind,'Nova atribuição',heading,CASE WHEN kind='task_assigned' THEN 'task' ELSE 'ticket' END,entity);
 RETURN NEW;END $$;
SELECT cron.schedule('office-delivery-retry','*/10 * * * *', $job$
 SELECT net.http_post(url:='https://office.vibedistro.com/api/notifications/deliver',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||s.decrypted_secret),body:=jsonb_build_object('id',n.id),timeout_milliseconds:=15000)
 FROM public.notifications n JOIN public.notification_preferences p ON p.user_id=n.user_id AND p.notification_type=n.type
 CROSS JOIN vault.decrypted_secrets s WHERE s.name='office_notification_webhook_secret' AND n.created_at>now()-interval '24 hours'
 AND ((p.enable_push AND n.push_sent_at IS NULL) OR (p.enable_email AND n.email_sent_at IS NULL AND n.type NOT IN('message_received','mentioned_in_chat'))) ORDER BY n.created_at LIMIT 100;
 $job$);
COMMIT;
