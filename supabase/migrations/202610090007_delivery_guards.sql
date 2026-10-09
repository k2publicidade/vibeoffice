BEGIN;
-- Re-evaluate the recipient at delivery time, including retries of older rows.
SELECT cron.schedule('office-delivery-retry','*/10 * * * *', $job$
 SELECT net.http_post(url:='https://office.vibedistro.com/api/notifications/deliver',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||s.decrypted_secret),body:=jsonb_build_object('id',n.id),timeout_milliseconds:=15000)
 FROM public.notifications n JOIN public.notification_preferences p ON p.user_id=n.user_id AND p.notification_type=n.type
 JOIN public.users u ON u.id=n.user_id AND u.active
 CROSS JOIN vault.decrypted_secrets s WHERE s.name='office_notification_webhook_secret' AND n.created_at>now()-interval '24 hours' AND NOT n.archived
 AND ((p.enable_push AND n.push_sent_at IS NULL) OR (p.enable_email AND n.email_sent_at IS NULL AND n.type NOT IN('message_received','mentioned_in_chat'))) ORDER BY n.created_at LIMIT 100;
 $job$);
SELECT cron.schedule('office-due-soon','0 * * * *', $job$
 INSERT INTO public.notifications(user_id,type,title,message,entity_type,entity_id)
 SELECT a.user_id,'task_due_soon','Tarefa vence em breve',t.title,'task',t.id FROM public.tasks t JOIN public.task_assignees a ON a.task_id=t.id
 JOIN public.users u ON u.id=a.user_id AND u.active
 WHERE t.status<>'done' AND t.due_date>now() AND t.due_date<=now()+interval '24 hours' AND NOT EXISTS(SELECT 1 FROM public.notifications n WHERE n.user_id=a.user_id AND n.entity_id=t.id AND n.type='task_due_soon' AND n.created_at>now()-interval '24 hours')
 AND coalesce((SELECT p.enable_in_app OR p.enable_push OR p.enable_email FROM public.notification_preferences p WHERE p.user_id=a.user_id AND p.notification_type='task_due_soon'),true)
 $job$);
COMMIT;
