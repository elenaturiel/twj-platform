-- =============================================================================
-- TWJ · Fase 3 · Seguimiento: métricas configurables por cliente, registros,
-- fotos de progreso (privadas), check-ins con respuesta de Jaime y campos
-- personalizados de la ficha.
-- =============================================================================

create table public.metric_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_]+$'),
  name text not null,
  type text not null check (type in ('number', 'scale', 'text', 'photo')),
  unit text,
  suggested_frequency text not null default 'weekly' check (suggested_frequency in ('daily', 'weekly', 'monthly')),
  higher_is_better boolean, -- null = depende del objetivo del cliente
  is_system boolean not null default false,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

-- Todas ocultas por defecto: Jaime activa las que pacta con cada cliente.
create table public.client_metrics (
  client_id uuid not null references public.clients (id) on delete cascade,
  metric_id uuid not null references public.metric_definitions (id) on delete cascade,
  frequency text not null default 'weekly' check (frequency in ('daily', 'weekly', 'monthly')),
  target_value numeric(10, 2),
  target_direction text check (target_direction in ('up', 'down', 'keep')),
  is_active boolean not null default true,
  activated_at timestamptz not null default now(),
  primary key (client_id, metric_id)
);

create table public.checkin_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  questions jsonb not null default '[]'::jsonb, -- [{key,label,type:'text'|'scale'|'number'|'yesno',required}]
  include_metrics boolean not null default true,
  include_photos boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index checkin_templates_one_default on public.checkin_templates (is_default) where is_default;
create trigger checkin_templates_updated_at before update on public.checkin_templates
  for each row execute function public.set_updated_at();

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  template_id uuid references public.checkin_templates (id) on delete set null,
  due_on date not null,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'reviewed', 'missed')),
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  staff_reply text,
  staff_voice_path text,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (client_id, due_on)
);
create index checkins_status_idx on public.checkins (status, due_on);
create index checkins_client_idx on public.checkins (client_id, due_on desc);

create table public.checkin_answers (
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  question_key text not null,
  question_label text not null,
  value jsonb,
  primary key (checkin_id, question_key)
);

create table public.metric_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  metric_id uuid not null references public.metric_definitions (id) on delete cascade,
  value_num numeric(10, 2),
  value_text text check (length(value_text) <= 1000),
  recorded_on date not null,
  source text not null default 'manual' check (source in ('manual', 'checkin', 'integration')),
  checkin_id uuid references public.checkins (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (client_id, metric_id, recorded_on),
  check (value_num is not null or value_text is not null)
);
create index metric_entries_client_metric_idx on public.metric_entries (client_id, metric_id, recorded_on);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  storage_path text not null unique,
  pose text not null default 'front' check (pose in ('front', 'side', 'back', 'other')),
  taken_on date not null,
  checkin_id uuid references public.checkins (id) on delete set null,
  created_at timestamptz not null default now()
);
create index progress_photos_client_idx on public.progress_photos (client_id, taken_on desc);

create table public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_]+$'),
  label text not null,
  type text not null check (type in ('text', 'number', 'select', 'date')),
  options text[] not null default '{}',
  client_editable boolean not null default false,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

-- Fila = campo asignado al cliente (con o sin valor)
create table public.custom_field_values (
  client_id uuid not null references public.clients (id) on delete cascade,
  field_id uuid not null references public.custom_fields (id) on delete cascade,
  value jsonb,
  updated_at timestamptz not null default now(),
  primary key (client_id, field_id)
);
create trigger custom_field_values_updated_at before update on public.custom_field_values
  for each row execute function public.set_updated_at();

-- Cambios del cliente en sus campos editables → profile_changes (como la ficha)
create or replace function public.track_custom_field_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text;
  v_onboarded timestamptz;
begin
  if auth.uid() is null or public.is_staff() or new.value is not distinct from old.value then
    return new;
  end if;
  select c.onboarding_completed_at into v_onboarded from public.clients c where c.id = new.client_id;
  if v_onboarded is null then
    return new;
  end if;
  select f.label into v_label from public.custom_fields f where f.id = new.field_id;
  insert into public.profile_changes (client_id, changed_by, table_name, field, old_value, new_value)
  values (new.client_id, auth.uid(), 'custom_field_values', 'custom:' || coalesce(v_label, 'campo'), old.value, new.value);
  return new;
end;
$$;
create trigger custom_field_values_track after update on public.custom_field_values
  for each row execute function public.track_custom_field_changes();

-- Cada check-in o registro cuenta como actividad
create trigger metric_entries_touch_activity after insert on public.metric_entries
  for each row execute function public.touch_client_activity();
create or replace function public.touch_client_activity_checkin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.submitted_at is not null and old.submitted_at is null then
    update public.clients set last_activity_at = now() where id = new.client_id;
  end if;
  return new;
end;
$$;
create trigger checkins_touch_activity after update of submitted_at on public.checkins
  for each row execute function public.touch_client_activity_checkin();

-- -----------------------------------------------------------------------------
-- Storage: fotos de progreso (datos de salud) y notas de voz de Jaime
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('progress-photos', 'progress-photos', false, 10 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('voice-notes', 'voice-notes', false, 10 * 1024 * 1024, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'])
on conflict (id) do nothing;

create policy progress_photos_own on storage.objects for all to authenticated
  using (bucket_id = 'progress-photos' and public.storage_owner_segment(name) = (select public.my_client_id())::text)
  with check (bucket_id = 'progress-photos' and public.storage_owner_segment(name) = (select public.my_client_id())::text);
create policy progress_photos_staff on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos' and (select public.has_scope('health')));
create policy voice_notes_staff on storage.objects for all to authenticated
  using (bucket_id = 'voice-notes' and (select public.has_scope('clients')))
  with check (bucket_id = 'voice-notes' and (select public.has_scope('clients')));
create policy voice_notes_client on storage.objects for select to authenticated
  using (bucket_id = 'voice-notes' and public.storage_owner_segment(name) = (select public.my_client_id())::text);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.metric_definitions enable row level security;
alter table public.client_metrics enable row level security;
alter table public.metric_entries enable row level security;
alter table public.progress_photos enable row level security;
alter table public.checkin_templates enable row level security;
alter table public.checkins enable row level security;
alter table public.checkin_answers enable row level security;
alter table public.custom_fields enable row level security;
alter table public.custom_field_values enable row level security;

grant select, insert, update, delete on public.metric_definitions, public.checkin_templates, public.custom_fields to authenticated;
create policy metric_definitions_read on public.metric_definitions for select to authenticated using (true);
create policy metric_definitions_write on public.metric_definitions for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy checkin_templates_read on public.checkin_templates for select to authenticated using (true);
create policy checkin_templates_write on public.checkin_templates for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy custom_fields_read on public.custom_fields for select to authenticated using (true);
create policy custom_fields_write on public.custom_fields for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));

grant select, insert, update, delete on public.client_metrics to authenticated;
create policy client_metrics_read on public.client_metrics for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy client_metrics_write on public.client_metrics for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));

-- Métricas y fotos son datos de salud: el propio cliente y staff con scope health.
grant select, insert, update, delete on public.metric_entries, public.progress_photos to authenticated;
create policy metric_entries_read on public.metric_entries for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.has_scope('health')));
create policy metric_entries_own on public.metric_entries for insert to authenticated
  with check (client_id = (select public.my_client_id()) and public.client_has_access(client_id));
create policy metric_entries_own_update on public.metric_entries for update to authenticated
  using (client_id = (select public.my_client_id())) with check (client_id = (select public.my_client_id()));
create policy metric_entries_delete on public.metric_entries for delete to authenticated
  using (client_id = (select public.my_client_id()) or (select public.has_scope('health')));
create policy progress_photos_read on public.progress_photos for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.has_scope('health')));
create policy progress_photos_own on public.progress_photos for insert to authenticated
  with check (client_id = (select public.my_client_id()) and public.client_has_access(client_id));
create policy progress_photos_delete on public.progress_photos for delete to authenticated
  using (client_id = (select public.my_client_id()) or (select public.has_scope('health')));

-- Check-ins: los crea el sistema; el cliente los rellena; staff los revisa.
grant select, insert, update on public.checkins to authenticated;
grant select, insert, update, delete on public.checkin_answers to authenticated;
create policy checkins_read on public.checkins for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy checkins_client_submit on public.checkins for update to authenticated
  using (client_id = (select public.my_client_id()) and status in ('pending', 'missed'))
  with check (client_id = (select public.my_client_id()) and status = 'submitted' and reviewed_by is null);
create policy checkins_staff on public.checkins for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy checkin_answers_read on public.checkin_answers for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy checkin_answers_own on public.checkin_answers for all to authenticated
  using (client_id = (select public.my_client_id()))
  with check (client_id = (select public.my_client_id()) and public.client_has_access(client_id));

grant select, insert, update, delete on public.custom_field_values to authenticated;
create policy custom_field_values_read on public.custom_field_values for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy custom_field_values_staff on public.custom_field_values for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy custom_field_values_client on public.custom_field_values for update to authenticated
  using (client_id = (select public.my_client_id()) and exists (select 1 from public.custom_fields f where f.id = field_id and f.client_editable))
  with check (client_id = (select public.my_client_id()));

-- -----------------------------------------------------------------------------
-- Datos de referencia
-- -----------------------------------------------------------------------------
insert into public.metric_definitions (key, name, type, unit, suggested_frequency, higher_is_better, is_system, sort_order) values
  ('weight', 'Peso', 'number', 'kg', 'weekly', null, true, 1),
  ('waist', 'Cintura', 'number', 'cm', 'monthly', null, true, 2),
  ('chest', 'Pecho', 'number', 'cm', 'monthly', null, true, 3),
  ('hips', 'Cadera', 'number', 'cm', 'monthly', null, true, 4),
  ('arm', 'Brazo', 'number', 'cm', 'monthly', null, true, 5),
  ('thigh', 'Muslo', 'number', 'cm', 'monthly', null, true, 6),
  ('body_fat', '% graso', 'number', '%', 'monthly', null, true, 7),
  ('steps', 'Pasos', 'number', 'pasos/día', 'daily', true, true, 8),
  ('sleep', 'Sueño', 'number', 'h', 'daily', true, true, 9),
  ('energy', 'Energía', 'scale', '1-10', 'weekly', true, true, 10),
  ('plan_adherence', 'Adherencia al plan', 'scale', '1-10', 'weekly', true, true, 11),
  ('feelings', 'Sensaciones', 'scale', '1-10', 'weekly', true, true, 12),
  ('avg_rpe', 'RPE medio', 'scale', '1-10', 'weekly', null, true, 13),
  ('progress_photos', 'Fotos de progreso', 'photo', null, 'monthly', null, true, 14);

-- TODO(Jaime): sustituir por las preguntas reales del check-in semanal.
insert into public.checkin_templates (name, is_default, questions) values
  ('Check-in semanal', true, '[
    {"key":"week","label":"¿Qué tal ha ido la semana en general?","type":"scale","required":true},
    {"key":"workouts","label":"¿Cuántos entrenos has hecho?","type":"number","required":true},
    {"key":"food","label":"¿Qué tal con el menú? (1 = desastre, 10 = clavado)","type":"scale","required":false},
    {"key":"pain","label":"¿Alguna molestia o dolor?","type":"yesno","required":true},
    {"key":"notes","label":"¿Algo que deba saber Jaime? (exámenes, viajes, cómo te has sentido…)","type":"text","required":false}
  ]'::jsonb);

insert into public.message_templates (key, channel, subject, body, variables, description) values
  ('checkin_due', 'email', 'Toca check-in', 'Hola {{nombre}}: te toca el check-in. Son 3 minutos y a Jaime le sirven para ajustar tu plan.\n\n{{enlace}}', array['nombre', 'enlace'], 'Recordatorio de check-in'),
  ('checkin_reviewed', 'email', 'Jaime ha revisado tu check-in', 'Hola {{nombre}}: Jaime ya ha revisado tu check-in y te ha dejado respuesta.\n\n{{enlace}}', array['nombre', 'enlace'], 'Aviso de check-in revisado')
on conflict (key) do nothing;

-- Día del check-in con la misma convención que los entrenos (0 = lunes … 6 = domingo)
update public.settings
set value = '6'::jsonb, description = 'Día del check-in por defecto (0 = lunes … 6 = domingo)'
where key = 'checkins.default_weekday';
