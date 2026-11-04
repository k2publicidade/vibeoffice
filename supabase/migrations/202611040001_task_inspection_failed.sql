ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'inspection_failed';

CREATE OR REPLACE FUNCTION public.save_office_task(task_id uuid, changes jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE t public.tasks; ticket_id uuid; assignees uuid[]; ticket_state public.ticket_status;
BEGIN
  IF public.office_role() IS NULL THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(changes)<>'object' OR changes IS NULL THEN RAISE EXCEPTION 'Dados inválidos'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(changes) k WHERE k NOT IN ('title','description','status','priority','sector','tags','due_date','assignees')) THEN
    RAISE EXCEPTION 'Campo de tarefa inválido';
  END IF;
  IF task_id IS NULL THEN
    INSERT INTO public.tasks(title,description,status,priority,sector,tags,due_date,created_by)
      VALUES (changes->>'title',changes->>'description',coalesce((changes->>'status')::public.task_status,'todo'),
        coalesce((changes->>'priority')::public.priority_type,'medium'),(changes->>'sector')::public.sector_type,
        ARRAY(SELECT jsonb_array_elements_text(coalesce(changes->'tags','[]'))), (changes->>'due_date')::timestamptz,auth.uid()) RETURNING * INTO t;
    IF public.office_role()='Colaborador' THEN
      assignees=ARRAY[auth.uid()];
      UPDATE public.tasks SET tags=ARRAY(SELECT DISTINCT unnest(t.tags||ARRAY['demanda-interna'])) WHERE id=t.id RETURNING * INTO t;
    ELSE
      assignees=ARRAY(SELECT DISTINCT value::uuid FROM jsonb_array_elements_text(coalesce(changes->'assignees','[]')));
    END IF;
  ELSE
    SELECT * INTO t FROM public.tasks WHERE id=task_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Tarefa indisponível' USING ERRCODE='42501'; END IF;
    UPDATE public.tasks SET
      title=CASE WHEN changes?'title' THEN changes->>'title' ELSE t.title END,
      description=CASE WHEN changes?'description' THEN changes->>'description' ELSE t.description END,
      status=CASE WHEN changes?'status' THEN (changes->>'status')::public.task_status ELSE t.status END,
      priority=CASE WHEN changes?'priority' THEN (changes->>'priority')::public.priority_type ELSE t.priority END,
      sector=CASE WHEN changes?'sector' THEN (changes->>'sector')::public.sector_type ELSE t.sector END,
      tags=CASE WHEN changes?'tags' THEN ARRAY(SELECT jsonb_array_elements_text(changes->'tags')) ELSE t.tags END,
      due_date=CASE WHEN changes?'due_date' THEN (changes->>'due_date')::timestamptz ELSE t.due_date END
      WHERE id=t.id RETURNING * INTO t;
    IF changes?'assignees' AND public.office_staff() THEN
      assignees=ARRAY(SELECT DISTINCT value::uuid FROM jsonb_array_elements_text(changes->'assignees'));
    END IF;
  END IF;
  IF assignees IS NOT NULL THEN
    DELETE FROM public.task_assignees WHERE task_assignees.task_id=t.id AND NOT(user_id=ANY(assignees));
    INSERT INTO public.task_assignees(task_id,user_id) SELECT t.id,unnest(assignees) ON CONFLICT DO NOTHING;
  END IF;
  ticket_state=CASE t.status::text WHEN 'done' THEN 'completed'::public.ticket_status WHEN 'in_progress' THEN 'in_progress'::public.ticket_status WHEN 'inspection_failed' THEN 'analyzing'::public.ticket_status ELSE 'open'::public.ticket_status END;
  IF task_id IS NULL THEN
    INSERT INTO public.tickets(title,description,category,status,priority,requester,created_by,assigned_to,linked_task_id)
      VALUES(t.title,coalesce(nullif(t.description,''),'Ticket gerado automaticamente para a tarefa: '||t.title),
        'Task Vinculada',ticket_state,t.priority,auth.uid(),auth.uid(),assignees[1],t.id) RETURNING id INTO ticket_id;
    UPDATE public.tasks SET linked_ticket_id=ticket_id WHERE id=t.id RETURNING * INTO t;
  ELSE
    UPDATE public.tickets SET
      title=CASE WHEN category='Task Vinculada' THEN t.title ELSE title END,
      description=CASE WHEN category='Task Vinculada' THEN coalesce(nullif(t.description,''),'Ticket gerado automaticamente para a tarefa: '||t.title) ELSE description END,
      status=ticket_state,
      priority=CASE WHEN category='Task Vinculada' THEN t.priority ELSE priority END,
      assigned_to=CASE WHEN category='Task Vinculada' AND assignees IS NOT NULL THEN assignees[1] ELSE assigned_to END
      WHERE linked_task_id=t.id OR (id=t.linked_ticket_id AND linked_task_id IS NULL);
  END IF;
  RETURN to_jsonb(t)||jsonb_build_object('task_assignees',coalesce((SELECT jsonb_agg(jsonb_build_object('user_id',user_id)) FROM public.task_assignees WHERE task_assignees.task_id=t.id),'[]'::jsonb));
END $$;
