-- Fresh database bootstrap. Run once, transactionally; never replay historical demo seeds.
BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TYPE sector_type AS ENUM (
  'A&R',
  'Marketing',
  'Financeiro',
  'Jurídico',
  'Administrativo',
  'TI/Suporte',
  'Atendimento ao Artista'
);
CREATE TYPE role_type AS ENUM (
  'Admin',
  'Gerente',
  'Colaborador'
);
CREATE TYPE task_status AS ENUM (
  'todo',
  'in_progress',
  'done'
);
CREATE TYPE priority_type AS ENUM (
  'low',
  'medium',
  'high'
);
CREATE TYPE ticket_status AS ENUM (
  'open',
  'analyzing',
  'in_progress',
  'completed'
);
CREATE TYPE room_type AS ENUM (
  'sector',
  'dm', 'project'
);
CREATE TYPE message_type AS ENUM (
  'text',
  'image',
  'file'
);
CREATE TYPE item_type AS ENUM (
  'file',
  'folder'
);
CREATE TYPE share_permission AS ENUM (
  'view',
  'edit',
  'manage'
);
CREATE TYPE event_type AS ENUM (
  'personal',
  'sector',
  'company'
);
CREATE TYPE announcement_priority AS ENUM ('info','warning','urgent');
CREATE TABLE public.users (
  -- Usar mesmo UUID de auth.users
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT,
  sector sector_type NOT NULL,
  role role_type NOT NULL DEFAULT 'Colaborador',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority priority_type NOT NULL DEFAULT 'medium',

  due_date TIMESTAMPTZ,

  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sector sector_type NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  tags TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  priority priority_type NOT NULL DEFAULT 'medium',

  requester UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.ticket_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,

  action TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  previous_value TEXT,
  new_value TEXT,

  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,

  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  attachments TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  edited_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name TEXT NOT NULL,
  type room_type NOT NULL,
  sector sector_type,

  participants UUID[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  type message_type NOT NULL DEFAULT 'text',

  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.drive_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name TEXT NOT NULL,
  type item_type NOT NULL,
  parent_id UUID REFERENCES public.drive_items(id) ON DELETE CASCADE,

  sector sector_type,

  -- Apenas para arquivos
  size BIGINT,
  mime_type TEXT,
  storage_path TEXT, -- Caminho no Supabase Storage

  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.shared_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  item_id UUID NOT NULL REFERENCES public.drive_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission share_permission NOT NULL DEFAULT 'view',

  shared_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(item_id, user_id)
);
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructor TEXT NOT NULL,
  thumbnail TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown
  video_url TEXT,
  "order" INTEGER NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.course_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,

  completed_lessons UUID[] DEFAULT '{}',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  last_accessed_at TIMESTAMPTZ,

  UNIQUE(user_id, course_id)
);
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  title TEXT NOT NULL,
  description TEXT,

  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,

  type event_type NOT NULL,
  sector sector_type,
  location TEXT,

  attendees UUID[] DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (end_time > start_time)
);
CREATE TABLE IF NOT EXISTS public.studio_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_title TEXT NOT NULL,
  studio_name TEXT NOT NULL DEFAULT 'Studio A', -- Studio A, Studio B, etc.
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  workstation_id TEXT, -- Qual PC/Mac foi usado
  session_types TEXT[] DEFAULT '{}', -- Gravacao, Mix, Master, etc.

  -- Armazenando participantes como JSONB arrays de {name, role, email, phone}
  producers JSONB DEFAULT '[]'::jsonb,
  artists JSONB DEFAULT '[]'::jsonb,
  composers JSONB DEFAULT '[]'::jsonb,

  notes TEXT,
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.releases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  release_type TEXT NOT NULL DEFAULT 'single' CHECK (release_type IN ('single', 'ep', 'album')),
  genre TEXT,
  release_date DATE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'released')),
  cover_url TEXT,
  spotify_url TEXT,
  apple_music_url TEXT,
  youtube_url TEXT,
  isrc TEXT,
  upc TEXT,
  label TEXT,
  distributor TEXT,
  notes TEXT,
  sector TEXT CHECK (sector IN ('A&R', 'Marketing', 'Financeiro', 'Jurídico', 'Administrativo', 'TI/Suporte', 'Atendimento ao Artista')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  position INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.company_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Conteúdo do aviso
  title TEXT NOT NULL CHECK (length(title) > 0 AND length(title) <= 100),
  message TEXT NOT NULL CHECK (length(message) > 0),
  priority announcement_priority NOT NULL DEFAULT 'info',

  -- Autoria e segmentação
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_sectors sector_type[] DEFAULT '{}',

  -- Validade e status
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  active BOOLEAN DEFAULT true,

  -- Metadados extras (links, anexos, etc)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: data de expiração deve ser futura na criação
  CONSTRAINT expires_in_future CHECK (expires_at > created_at)
);
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  enable_in_app BOOLEAN DEFAULT true,
  enable_push BOOLEAN DEFAULT false,
  enable_email BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);
CREATE TABLE IF NOT EXISTS public.user_chat_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one preference row per user-room pair
  UNIQUE(user_id, room_id)
);
-- Final application columns, independent of contradictory historical policies.
ALTER TABLE users ADD COLUMN phone text;
ALTER TABLE users ALTER COLUMN sector SET DEFAULT 'Administrativo';
ALTER TABLE tasks ADD COLUMN linked_ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN linked_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE chat_rooms ADD COLUMN description text, ADD COLUMN created_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN reactions jsonb NOT NULL DEFAULT '{}', ADD COLUMN read_by jsonb NOT NULL DEFAULT '{}', ADD COLUMN mentioned_users text[] NOT NULL DEFAULT '{}';
ALTER TABLE courses ALTER COLUMN description DROP NOT NULL, ALTER COLUMN instructor DROP NOT NULL;
ALTER TABLE courses ADD COLUMN slug text UNIQUE, ADD COLUMN subtitle text, ADD COLUMN is_published boolean NOT NULL DEFAULT true, ADD COLUMN duration integer, ADD COLUMN difficulty text DEFAULT 'beginner' CHECK(difficulty IN('beginner','intermediate','advanced')), ADD COLUMN tags text[] DEFAULT '{}', ADD COLUMN author_id uuid REFERENCES users(id) ON DELETE SET NULL, ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE TABLE modules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,title text NOT NULL,"order" integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE lessons ALTER COLUMN content DROP NOT NULL;
ALTER TABLE lessons ADD COLUMN module_id uuid REFERENCES modules(id) ON DELETE CASCADE, ADD COLUMN type text DEFAULT 'video' CHECK(type IN('video','html','quiz')), ADD COLUMN content_url text, ADD COLUMN duration integer, ADD COLUMN description text, ADD COLUMN materials jsonb DEFAULT '[]', ADD COLUMN chapter text;
CREATE TABLE user_course_progress(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,completed_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,lesson_id));
CREATE TABLE task_assignees(task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(task_id,user_id));
ALTER TABLE releases ADD COLUMN artists jsonb DEFAULT '[]', ADD COLUMN composers jsonb DEFAULT '[]', ADD COLUMN tracks jsonb DEFAULT '[]', ADD COLUMN platform_links jsonb DEFAULT '[]', ADD COLUMN wav_url text;
ALTER TABLE calendar_events ADD COLUMN linked_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE, ADD COLUMN linked_ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE, ADD COLUMN linked_release_id uuid REFERENCES releases(id) ON DELETE CASCADE;
ALTER TABLE studio_bookings ADD CONSTRAINT valid_session_time CHECK(end_time > start_time), ADD CONSTRAINT valid_session_status CHECK(status IN('scheduled','completed','cancelled'));
ALTER TABLE studio_bookings ADD CONSTRAINT no_studio_overlap EXCLUDE USING gist(studio_name WITH =,tsrange(booking_date+start_time,booking_date+end_time,'[)') WITH &&) WHERE(status <> 'cancelled');
CREATE TABLE push_subscriptions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,endpoint text NOT NULL UNIQUE,keys jsonb NOT NULL,created_at timestamptz DEFAULT now());

CREATE FUNCTION public.office_role() RETURNS public.role_type LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT role FROM public.users WHERE id=auth.uid() $$;
CREATE FUNCTION public.office_sector() RETURNS public.sector_type LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT sector FROM public.users WHERE id=auth.uid() $$;
CREATE FUNCTION public.office_staff() RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$ SELECT public.office_role() IN('Admin','Gerente') $$;
CREATE FUNCTION public.can_task(t uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM public.tasks WHERE id=t AND (public.office_staff() OR created_by=auth.uid() OR assigned_to=auth.uid() OR EXISTS(SELECT 1 FROM public.task_assignees WHERE task_id=t AND user_id=auth.uid()))) $$;
CREATE FUNCTION public.can_ticket(t uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM public.tickets WHERE id=t AND (public.office_staff() OR requester=auth.uid() OR assigned_to=auth.uid() OR (linked_task_id IS NOT NULL AND public.can_task(linked_task_id)))) $$;
CREATE FUNCTION public.can_room(r uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM public.chat_rooms WHERE id=r AND (auth.uid()=ANY(participants) OR (type='sector' AND sector=public.office_sector()))) $$;
CREATE FUNCTION public.can_drive(i uuid, writing boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH RECURSIVE ancestry AS (SELECT id,parent_id,uploaded_by,is_public,sector FROM public.drive_items WHERE id=i UNION ALL SELECT d.id,d.parent_id,d.uploaded_by,d.is_public,d.sector FROM public.drive_items d JOIN ancestry a ON d.id=a.parent_id)
 SELECT public.office_role()='Admin' OR EXISTS(SELECT 1 FROM ancestry a WHERE a.uploaded_by=auth.uid() OR (NOT writing AND (a.is_public OR a.sector=public.office_sector())) OR EXISTS(SELECT 1 FROM public.shared_access s WHERE s.item_id=a.id AND s.user_id=auth.uid() AND (NOT writing OR s.permission IN('edit','manage')))) $$;

CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 INSERT INTO public.users(id,email,name,sector,role,avatar) VALUES(NEW.id,NEW.email,coalesce(nullif(NEW.raw_user_meta_data->>'name',''),split_part(NEW.email,'@',1)),'Administrativo','Colaborador',NEW.raw_user_meta_data->>'avatar'); RETURN NEW; END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE FUNCTION public.protect_profile() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF current_user='authenticated' AND (NEW.id<>OLD.id OR NEW.email<>OLD.email OR (public.office_role()<>'Admin' AND (NEW.role<>OLD.role OR NEW.sector<>OLD.sector))) THEN RAISE EXCEPTION 'Somente o ADMIN pode alterar cargo ou setor'; END IF; RETURN NEW; END $$;
CREATE TRIGGER protect_profile BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION public.protect_profile();
CREATE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
DO $$ DECLARE t text; BEGIN FOR t IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='updated_at' LOOP EXECUTE format('CREATE TRIGGER touch_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()',t); END LOOP; END $$;

-- Every application table is private to authenticated staff with a profile.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
DO $$ DECLARE t text; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t); END LOOP; END $$;
CREATE POLICY users_read ON users FOR SELECT TO authenticated USING(public.office_role() IS NOT NULL);
CREATE POLICY users_update ON users FOR UPDATE TO authenticated USING(id=auth.uid() OR public.office_role()='Admin') WITH CHECK(id=auth.uid() OR public.office_role()='Admin');
CREATE POLICY tasks_read ON tasks FOR SELECT TO authenticated USING(public.can_task(id));
CREATE POLICY tasks_create ON tasks FOR INSERT TO authenticated WITH CHECK(created_by=auth.uid() AND (public.office_staff() OR sector=public.office_sector()));
CREATE POLICY tasks_edit ON tasks FOR UPDATE TO authenticated USING(public.can_task(id)) WITH CHECK(public.can_task(id));
CREATE POLICY tasks_delete ON tasks FOR DELETE TO authenticated USING(public.office_staff() OR created_by=auth.uid());
CREATE POLICY assignees_read ON task_assignees FOR SELECT TO authenticated USING(public.can_task(task_id));
CREATE POLICY assignees_create ON task_assignees FOR INSERT TO authenticated WITH CHECK(public.can_task(task_id) AND (public.office_staff() OR user_id=auth.uid()));
CREATE POLICY assignees_delete ON task_assignees FOR DELETE TO authenticated USING(public.can_task(task_id) AND (public.office_staff() OR user_id=auth.uid()));
CREATE POLICY tickets_read ON tickets FOR SELECT TO authenticated USING(public.can_ticket(id));
CREATE POLICY tickets_create ON tickets FOR INSERT TO authenticated WITH CHECK(public.office_staff() OR (requester=auth.uid() AND (created_by IS NULL OR created_by=auth.uid())));
CREATE POLICY tickets_edit ON tickets FOR UPDATE TO authenticated USING(public.can_ticket(id)) WITH CHECK(public.can_ticket(id));
CREATE POLICY tickets_delete ON tickets FOR DELETE TO authenticated USING(public.office_staff() OR requester=auth.uid());
CREATE POLICY comments_read ON ticket_comments FOR SELECT TO authenticated USING(public.can_ticket(ticket_id) AND (NOT is_internal OR public.office_staff()));
CREATE POLICY comments_create ON ticket_comments FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND public.can_ticket(ticket_id) AND (NOT is_internal OR public.office_staff()));
CREATE POLICY comments_edit ON ticket_comments FOR UPDATE TO authenticated USING(user_id=auth.uid() OR public.office_staff()) WITH CHECK(public.can_ticket(ticket_id));
CREATE POLICY comments_delete ON ticket_comments FOR DELETE TO authenticated USING(user_id=auth.uid() OR public.office_staff());
CREATE POLICY history_read ON ticket_history FOR SELECT TO authenticated USING(public.can_ticket(ticket_id));
CREATE POLICY history_create ON ticket_history FOR INSERT TO authenticated WITH CHECK(changed_by=auth.uid() AND public.can_ticket(ticket_id));
CREATE POLICY rooms_read ON chat_rooms FOR SELECT TO authenticated USING(public.can_room(id));
CREATE POLICY rooms_create ON chat_rooms FOR INSERT TO authenticated WITH CHECK(created_by=auth.uid() AND auth.uid()=ANY(participants) AND type IN('dm','project'));
CREATE POLICY rooms_edit ON chat_rooms FOR UPDATE TO authenticated USING(public.can_room(id)) WITH CHECK(public.can_room(id));
CREATE POLICY rooms_delete ON chat_rooms FOR DELETE TO authenticated USING(created_by=auth.uid() OR public.office_role()='Admin');
CREATE POLICY messages_read ON messages FOR SELECT TO authenticated USING(public.can_room(room_id));
CREATE POLICY messages_create ON messages FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND public.can_room(room_id));
CREATE POLICY messages_edit ON messages FOR UPDATE TO authenticated USING(user_id=auth.uid() AND public.can_room(room_id)) WITH CHECK(user_id=auth.uid() AND public.can_room(room_id));
CREATE POLICY messages_delete ON messages FOR DELETE TO authenticated USING(user_id=auth.uid() AND public.can_room(room_id));
CREATE POLICY chat_prefs ON user_chat_preferences FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid() AND public.can_room(room_id));
CREATE POLICY drive_read ON drive_items FOR SELECT TO authenticated USING(public.can_drive(id));
CREATE POLICY drive_create ON drive_items FOR INSERT TO authenticated WITH CHECK(uploaded_by=auth.uid() AND (parent_id IS NULL OR public.can_drive(parent_id,true)));
CREATE POLICY drive_edit ON drive_items FOR UPDATE TO authenticated USING(public.can_drive(id,true)) WITH CHECK(public.can_drive(id,true) AND (parent_id IS NULL OR parent_id<>id));
CREATE POLICY drive_delete ON drive_items FOR DELETE TO authenticated USING(public.can_drive(id,true));
CREATE POLICY shares_read ON shared_access FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.can_drive(item_id,true));
CREATE POLICY shares_create ON shared_access FOR INSERT TO authenticated WITH CHECK(shared_by=auth.uid() AND public.can_drive(item_id,true));
CREATE POLICY shares_edit ON shared_access FOR UPDATE TO authenticated USING(public.can_drive(item_id,true)) WITH CHECK(public.can_drive(item_id,true));
CREATE POLICY shares_delete ON shared_access FOR DELETE TO authenticated USING(public.can_drive(item_id,true));
CREATE POLICY courses_read ON courses FOR SELECT TO authenticated USING(is_published OR public.office_role()='Admin');
CREATE POLICY courses_admin ON courses FOR ALL TO authenticated USING(public.office_role()='Admin') WITH CHECK(public.office_role()='Admin');
CREATE POLICY modules_read ON modules FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM courses WHERE id=course_id));
CREATE POLICY modules_admin ON modules FOR ALL TO authenticated USING(public.office_role()='Admin') WITH CHECK(public.office_role()='Admin');
CREATE POLICY lessons_read ON lessons FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM courses WHERE id=course_id));
CREATE POLICY lessons_admin ON lessons FOR ALL TO authenticated USING(public.office_role()='Admin') WITH CHECK(public.office_role()='Admin');
CREATE POLICY progress_own ON user_course_progress FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM lessons WHERE id=lesson_id AND course_id=user_course_progress.course_id));
CREATE POLICY legacy_progress_own ON course_progress FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY calendar_read ON calendar_events FOR SELECT TO authenticated USING(public.office_staff() OR created_by=auth.uid() OR auth.uid()=ANY(attendees) OR type='company' OR (type='sector' AND sector=public.office_sector()));
CREATE POLICY calendar_create ON calendar_events FOR INSERT TO authenticated WITH CHECK(created_by=auth.uid() AND (type<>'sector' OR sector=public.office_sector() OR public.office_staff()));
CREATE POLICY calendar_edit ON calendar_events FOR UPDATE TO authenticated USING(created_by=auth.uid() OR public.office_staff()) WITH CHECK(created_by=auth.uid() OR public.office_staff());
CREATE POLICY calendar_delete ON calendar_events FOR DELETE TO authenticated USING(created_by=auth.uid() OR public.office_staff());
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['studio_bookings','releases'] LOOP
 EXECUTE format('CREATE POLICY operational_read ON %I FOR SELECT TO authenticated USING(public.office_role() IS NOT NULL)',t);
 EXECUTE format('CREATE POLICY operational_create ON %I FOR INSERT TO authenticated WITH CHECK(created_by=auth.uid())',t);
 EXECUTE format('CREATE POLICY operational_edit ON %I FOR UPDATE TO authenticated USING(public.office_staff() OR created_by=auth.uid()) WITH CHECK(public.office_staff() OR created_by=auth.uid())',t);
 EXECUTE format('CREATE POLICY operational_delete ON %I FOR DELETE TO authenticated USING(public.office_staff() OR created_by=auth.uid())',t);
 END LOOP; END $$;
CREATE POLICY announcements_read ON company_announcements FOR SELECT TO authenticated USING(public.office_staff() OR (active AND expires_at>now() AND (cardinality(target_sectors)=0 OR public.office_sector()=ANY(target_sectors))));
CREATE POLICY announcements_staff ON company_announcements FOR ALL TO authenticated USING(public.office_staff()) WITH CHECK(public.office_staff());
CREATE POLICY notifications_read ON notifications FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY notifications_update ON notifications FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY notifications_delete ON notifications FOR DELETE TO authenticated USING(user_id=auth.uid());
CREATE POLICY notification_prefs ON notification_preferences FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY subscriptions_own ON push_subscriptions FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

-- Concurrent reactions and read receipts only change the caller's entry.
CREATE FUNCTION public.toggle_message_reaction(message_id uuid,emoji text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE m public.messages; members jsonb; BEGIN
 IF length(emoji)>32 OR length(emoji)=0 THEN RAISE EXCEPTION 'Invalid emoji'; END IF;
 SELECT * INTO m FROM public.messages WHERE id=message_id FOR UPDATE;
 IF NOT FOUND OR NOT public.can_room(m.room_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 members=coalesce(m.reactions->emoji,'[]'::jsonb);
 IF members ? auth.uid()::text THEN SELECT coalesce(jsonb_agg(v),'[]'::jsonb) INTO members FROM jsonb_array_elements(members) v WHERE v<>to_jsonb(auth.uid()::text);
 ELSE members=members || to_jsonb(auth.uid()::text); END IF;
 UPDATE public.messages SET reactions=CASE WHEN jsonb_array_length(members)=0 THEN reactions-emoji ELSE jsonb_set(reactions,ARRAY[emoji],members) END WHERE id=message_id; END $$;
CREATE FUNCTION public.mark_messages_read(message_ids uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 UPDATE public.messages SET read_by=read_by || jsonb_build_object(auth.uid()::text,now()) WHERE id=ANY(message_ids) AND public.can_room(room_id) AND user_id<>auth.uid(); END $$;
CREATE FUNCTION public.notify_assignment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE recipient uuid; entity uuid; heading text; kind text; BEGIN
 IF TG_TABLE_NAME='task_assignees' THEN recipient=NEW.user_id;entity=NEW.task_id;kind='task_assigned';SELECT title INTO heading FROM public.tasks WHERE id=entity;
 ELSE recipient=NEW.assigned_to;entity=NEW.id;kind='ticket_assigned';heading=NEW.title;IF TG_OP='UPDATE' AND NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN RETURN NEW; END IF; END IF;
 IF recipient IS NOT NULL AND recipient IS DISTINCT FROM auth.uid() AND coalesce((SELECT enable_in_app FROM public.notification_preferences WHERE user_id=recipient AND notification_type=kind),true) THEN
 INSERT INTO public.notifications(user_id,type,title,message,entity_type,entity_id) VALUES(recipient,kind,'Nova atribuição',heading,CASE WHEN kind='task_assigned' THEN 'task' ELSE 'ticket' END,entity); END IF;RETURN NEW; END $$;
CREATE TRIGGER notify_task AFTER INSERT ON task_assignees FOR EACH ROW EXECUTE FUNCTION public.notify_assignment();
CREATE TRIGGER notify_ticket AFTER INSERT OR UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION public.notify_assignment();
CREATE FUNCTION public.notify_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 UPDATE public.chat_rooms SET updated_at=now() WHERE id=NEW.room_id;
 INSERT INTO public.notifications(user_id,type,title,message,entity_type,entity_id,metadata)
 SELECT u.id,'message_received','Nova mensagem',left(NEW.content,200),'message',NEW.id,jsonb_build_object('roomId',NEW.room_id)
 FROM public.users u JOIN public.chat_rooms r ON r.id=NEW.room_id WHERE u.id<>NEW.user_id AND (u.id=ANY(r.participants) OR (r.type='sector' AND r.sector=u.sector)) AND coalesce((SELECT enable_in_app FROM public.notification_preferences WHERE user_id=u.id AND notification_type='message_received'),true);
 RETURN NEW; END $$;
CREATE TRIGGER notify_message AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION public.notify_message();

-- Private storage; no expiring URLs are persisted as permanent document addresses.
INSERT INTO storage.buckets(id,name,public,file_size_limit) VALUES('drive-files','drive-files',false,52428800),('release-assets','release-assets',false,52428800),('course-assets','course-assets',false,52428800);
CREATE POLICY files_read ON storage.objects FOR SELECT TO authenticated USING((bucket_id IN('release-assets','course-assets') AND public.office_role() IS NOT NULL) OR (bucket_id='drive-files' AND (owner_id=auth.uid()::text OR EXISTS(SELECT 1 FROM public.drive_items d WHERE d.storage_path=name AND public.can_drive(d.id)))));
CREATE POLICY files_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(public.office_role() IS NOT NULL AND (bucket_id IN('drive-files','release-assets') OR (bucket_id='course-assets' AND public.office_role()='Admin')));
CREATE POLICY files_edit ON storage.objects FOR UPDATE TO authenticated USING(owner_id=auth.uid()::text OR public.office_role()='Admin') WITH CHECK(bucket_id IN('drive-files','release-assets','course-assets') AND (owner_id=auth.uid()::text OR public.office_role()='Admin'));
CREATE POLICY files_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id IN('drive-files','release-assets','course-assets') AND (owner_id=auth.uid()::text OR public.office_role()='Admin' OR (bucket_id='drive-files' AND EXISTS(SELECT 1 FROM public.drive_items d WHERE d.storage_path=name AND public.can_drive(d.id,true)))));
INSERT INTO public.chat_rooms(name,type,sector) SELECT 'Canal '||s,'sector',s FROM unnest(enum_range(NULL::sector_type)) s;
DO $$ DECLARE t text; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t); END LOOP; END $$;
-- Index every referencing key; useful for authorization joins and cascade checks.
DO $$ DECLARE r record; BEGIN FOR r IN SELECT tc.table_name,kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu USING(constraint_catalog,constraint_schema,constraint_name) WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public' LOOP EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(%I)',r.table_name||'_'||r.column_name||'_idx',r.table_name,r.column_name); END LOOP; END $$;
CREATE INDEX messages_room_time_idx ON messages(room_id,timestamp);
CREATE INDEX notifications_user_time_idx ON notifications(user_id,created_at DESC);
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.office_role(),public.office_sector(),public.office_staff(),public.can_task(uuid),public.can_ticket(uuid),public.can_room(uuid),public.can_drive(uuid,boolean),public.toggle_message_reaction(uuid,text),public.mark_messages_read(uuid[]) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
