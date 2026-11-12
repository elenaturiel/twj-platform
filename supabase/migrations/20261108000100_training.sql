-- =============================================================================
-- TWJ · Fase 2 · Entrenamiento: biblioteca de ejercicios, plantillas, bloques,
-- semanas, sesiones (gym, funcional, running, HYROX), registros y récords.
-- Jerarquía: bloque → semana → sesión → parte (modalidad/formato) → ítem.
-- Las filas de plantilla tienen client_id null y template_id; las de cliente,
-- client_id. client_id se repite en cada nivel para que RLS sea simple y rápido.
-- =============================================================================

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  modality text not null default 'gym' check (modality in ('gym', 'functional', 'running', 'hyrox')),
  muscle_groups text[] not null default '{}',
  equipment text[] not null default '{}',
  video_url text,
  video_provider text check (video_provider in ('youtube', 'drive', 'storage', 'other')),
  instructions text,
  common_mistakes text,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index exercises_name_idx on public.exercises (lower(name));
create index exercises_modality_idx on public.exercises (modality) where is_active;
create trigger exercises_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();

create table public.exercise_relations (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  related_id uuid not null references public.exercises (id) on delete cascade,
  kind text not null check (kind in ('alternative', 'regression', 'progression')),
  primary key (exercise_id, related_id, kind),
  check (exercise_id <> related_id)
);

-- Estaciones oficiales de HYROX (orden de carrera). Pesos por categoría: TODO(Jaime),
-- cambian por temporada y no se inventan aquí.
create table public.hyrox_stations (
  key text primary key,
  name text not null,
  sort_order smallint not null,
  default_distance_m integer,
  default_reps integer,
  weights jsonb not null default '{}'::jsonb
);

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  modalities text[] not null default '{}',
  tags text[] not null default '{}',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger workout_templates_updated_at before update on public.workout_templates
  for each row execute function public.set_updated_at();

create table public.workout_blocks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  template_id uuid references public.workout_templates (id) on delete cascade,
  name text not null,
  goal text,
  starts_on date,
  status text not null default 'draft' check (status in ('draft', 'active', 'done')),
  sort_order smallint not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((client_id is null) <> (template_id is null))
);
create index workout_blocks_client_idx on public.workout_blocks (client_id, starts_on desc);
create index workout_blocks_template_idx on public.workout_blocks (template_id);
create trigger workout_blocks_updated_at before update on public.workout_blocks
  for each row execute function public.set_updated_at();

create table public.workout_weeks (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.workout_blocks (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  week_index smallint not null check (week_index >= 0),
  is_deload boolean not null default false,
  notes text,
  unique (block_id, week_index)
);
create index workout_weeks_client_idx on public.workout_weeks (client_id);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.workout_weeks (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  title text not null,
  day_index smallint check (day_index between 0 and 6), -- 0 = lunes
  sort_order smallint not null default 0,
  notes text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workout_sessions_week_idx on public.workout_sessions (week_id, sort_order);
create index workout_sessions_client_idx on public.workout_sessions (client_id);
create trigger workout_sessions_updated_at before update on public.workout_sessions
  for each row execute function public.set_updated_at();

create table public.session_parts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  sort_order smallint not null default 0,
  title text,
  modality text not null check (modality in ('gym', 'functional', 'running', 'hyrox')),
  format text not null default 'straight'
    check (format in ('straight', 'superset', 'circuit', 'amrap', 'emom', 'for_time', 'tabata', 'rounds', 'run', 'hyrox_sim', 'hyrox_stations')),
  params jsonb not null default '{}'::jsonb,
  notes text
);
create index session_parts_session_idx on public.session_parts (session_id, sort_order);
create index session_parts_client_idx on public.session_parts (client_id);

create table public.session_items (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.session_parts (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete set null,
  name text, -- tarea libre o nombre si no hay ejercicio de la biblioteca
  sort_order smallint not null default 0,
  superset_group text,
  prescription jsonb not null default '{}'::jsonb,
  notes text,
  check (exercise_id is not null or name is not null)
);
create index session_items_part_idx on public.session_items (part_id, sort_order);
create index session_items_client_idx on public.session_items (client_id);

-- Registros reales del cliente. El id lo genera el móvil (idempotente sin conexión).
create table public.workout_logs (
  id uuid primary key,
  client_id uuid not null references public.clients (id) on delete cascade,
  session_id uuid references public.workout_sessions (id) on delete set null,
  title text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_time_s integer check (total_time_s >= 0),
  session_rpe numeric(3, 1) check (session_rpe between 0 and 10),
  feeling smallint check (feeling between 1 and 5),
  comment text check (length(comment) <= 2000),
  coach_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workout_logs_client_idx on public.workout_logs (client_id, started_at desc);
create index workout_logs_session_idx on public.workout_logs (session_id);
create trigger workout_logs_updated_at before update on public.workout_logs
  for each row execute function public.set_updated_at();

create table public.set_logs (
  id uuid primary key,
  workout_log_id uuid not null references public.workout_logs (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  session_item_id uuid references public.session_items (id) on delete set null,
  exercise_id uuid references public.exercises (id) on delete set null,
  set_index smallint not null default 0,
  reps smallint check (reps >= 0),
  load_kg numeric(6, 2) check (load_kg >= 0),
  rpe numeric(3, 1) check (rpe between 0 and 10),
  duration_s integer check (duration_s >= 0),
  distance_m integer check (distance_m >= 0),
  pace_s_per_km integer check (pace_s_per_km > 0),
  hr_avg smallint check (hr_avg between 30 and 250),
  station_key text references public.hyrox_stations (key),
  notes text,
  created_at timestamptz not null default now()
);
create index set_logs_log_idx on public.set_logs (workout_log_id, set_index);
create index set_logs_client_exercise_idx on public.set_logs (client_id, exercise_id);

create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete cascade,
  record_type text not null check (record_type in ('max_load', 'e1rm', 'max_reps', 'best_time', 'best_pace', 'longest_distance', 'hyrox_total', 'hyrox_station')),
  record_key text not null default '', -- p. ej. "5000" (m), clave de estación, nº reps
  value numeric(10, 2) not null,
  unit text not null,
  set_log_id uuid references public.set_logs (id) on delete set null,
  workout_log_id uuid references public.workout_logs (id) on delete set null,
  achieved_at timestamptz not null default now()
);
create index personal_records_client_idx on public.personal_records (client_id, record_type, exercise_id, record_key, achieved_at desc);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('workouts', 'exercises', 'foods')),
  file_name text,
  target jsonb not null default '{}'::jsonb,
  status text not null default 'done' check (status in ('validated', 'done', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  row_errors jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Copia profunda de un bloque (asignar plantilla, guardar como plantilla,
-- duplicar bloque). Security invoker: RLS decide quién puede.
-- -----------------------------------------------------------------------------
create or replace function public.copy_block(p_block uuid, p_client uuid, p_template uuid, p_starts_on date, p_name text default null)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_new_block uuid;
  w record;
  s record;
  p record;
  v_week uuid;
  v_session uuid;
  v_part uuid;
begin
  if (p_client is null) = (p_template is null) then
    raise exception 'Indica cliente o plantilla de destino';
  end if;

  insert into public.workout_blocks (client_id, template_id, name, goal, starts_on, status, notes)
  select p_client, p_template, coalesce(p_name, b.name), b.goal, p_starts_on, 'draft', b.notes
  from public.workout_blocks b where b.id = p_block
  returning id into v_new_block;
  if v_new_block is null then
    raise exception 'Bloque no encontrado';
  end if;

  for w in select * from public.workout_weeks where block_id = p_block order by week_index loop
    insert into public.workout_weeks (block_id, client_id, week_index, is_deload, notes)
    values (v_new_block, p_client, w.week_index, w.is_deload, w.notes) returning id into v_week;
    for s in select * from public.workout_sessions where week_id = w.id order by sort_order loop
      insert into public.workout_sessions (week_id, client_id, title, day_index, sort_order, notes, published)
      values (v_week, p_client, s.title, s.day_index, s.sort_order, s.notes, s.published) returning id into v_session;
      for p in select * from public.session_parts where session_id = s.id order by sort_order loop
        insert into public.session_parts (session_id, client_id, sort_order, title, modality, format, params, notes)
        values (v_session, p_client, p.sort_order, p.title, p.modality, p.format, p.params, p.notes) returning id into v_part;
        insert into public.session_items (part_id, client_id, exercise_id, name, sort_order, superset_group, prescription, notes)
        select v_part, p_client, i.exercise_id, i.name, i.sort_order, i.superset_group, i.prescription, i.notes
        from public.session_items i where i.part_id = p.id;
      end loop;
    end loop;
  end loop;
  return v_new_block;
end;
$$;

-- Duplica una semana al final del mismo bloque (o como descarga)
create or replace function public.copy_week(p_week uuid, p_as_deload boolean default false)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  w public.workout_weeks;
  s record;
  p record;
  v_week uuid;
  v_session uuid;
  v_part uuid;
  v_index smallint;
begin
  select * into w from public.workout_weeks where id = p_week;
  if w.id is null then
    raise exception 'Semana no encontrada';
  end if;
  select coalesce(max(week_index), -1) + 1 into v_index from public.workout_weeks where block_id = w.block_id;
  insert into public.workout_weeks (block_id, client_id, week_index, is_deload, notes)
  values (w.block_id, w.client_id, v_index, p_as_deload, w.notes) returning id into v_week;
  for s in select * from public.workout_sessions where week_id = w.id order by sort_order loop
    insert into public.workout_sessions (week_id, client_id, title, day_index, sort_order, notes, published)
    values (v_week, w.client_id, s.title, s.day_index, s.sort_order, s.notes, s.published) returning id into v_session;
    for p in select * from public.session_parts where session_id = s.id order by sort_order loop
      insert into public.session_parts (session_id, client_id, sort_order, title, modality, format, params, notes)
      values (v_session, w.client_id, p.sort_order, p.title, p.modality, p.format, p.params, p.notes) returning id into v_part;
      insert into public.session_items (part_id, client_id, exercise_id, name, sort_order, superset_group, prescription, notes)
      select v_part, w.client_id, i.exercise_id, i.name, i.sort_order, i.superset_group, i.prescription, i.notes
      from public.session_items i where i.part_id = p.id;
    end loop;
  end loop;
  return v_week;
end;
$$;

-- Al completar un entreno se actualiza la última actividad del cliente
create or replace function public.touch_client_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.clients set last_activity_at = now() where id = new.client_id;
  return new;
end;
$$;
create trigger workout_logs_touch_activity after insert or update of completed_at on public.workout_logs
  for each row when (new.completed_at is not null) execute function public.touch_client_activity();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.exercises enable row level security;
alter table public.exercise_relations enable row level security;
alter table public.hyrox_stations enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_blocks enable row level security;
alter table public.workout_weeks enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.session_parts enable row level security;
alter table public.session_items enable row level security;
alter table public.workout_logs enable row level security;
alter table public.set_logs enable row level security;
alter table public.personal_records enable row level security;
alter table public.import_jobs enable row level security;

grant select on public.exercises, public.exercise_relations, public.hyrox_stations to authenticated;
grant insert, update, delete on public.exercises, public.exercise_relations, public.hyrox_stations to authenticated;
create policy exercises_read on public.exercises for select to authenticated using (is_active or (select public.is_staff()));
create policy exercises_write on public.exercises for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy exercise_relations_read on public.exercise_relations for select to authenticated using (true);
create policy exercise_relations_write on public.exercise_relations for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy hyrox_stations_read on public.hyrox_stations for select to authenticated using (true);
create policy hyrox_stations_write on public.hyrox_stations for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));

grant select, insert, update, delete on public.workout_templates, public.import_jobs to authenticated;
create policy workout_templates_staff on public.workout_templates for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy import_jobs_staff on public.import_jobs for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));

-- Estructura del plan: el cliente lee lo suyo (bloques no borrador, sesiones publicadas); staff todo.
grant select, insert, update, delete on public.workout_blocks, public.workout_weeks, public.workout_sessions, public.session_parts, public.session_items to authenticated;
create policy workout_blocks_read on public.workout_blocks for select to authenticated
  using ((client_id = (select public.my_client_id()) and status <> 'draft') or (select public.is_staff()));
create policy workout_weeks_read on public.workout_weeks for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy workout_sessions_read on public.workout_sessions for select to authenticated
  using ((client_id = (select public.my_client_id()) and published) or (select public.is_staff()));
create policy session_parts_read on public.session_parts for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy session_items_read on public.session_items for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy workout_blocks_write on public.workout_blocks for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy workout_weeks_write on public.workout_weeks for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy workout_sessions_write on public.workout_sessions for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy session_parts_write on public.session_parts for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy session_items_write on public.session_items for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));

-- Registros: el cliente gestiona los suyos (si tiene acceso); staff lee y corrige.
grant select, insert, update, delete on public.workout_logs, public.set_logs, public.personal_records to authenticated;
create policy workout_logs_read on public.workout_logs for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy workout_logs_own on public.workout_logs for insert to authenticated
  with check (client_id = (select public.my_client_id()) and public.client_has_access(client_id));
create policy workout_logs_own_update on public.workout_logs for update to authenticated
  using (client_id = (select public.my_client_id()) or (select public.has_scope('clients')))
  with check (client_id = (select public.my_client_id()) or (select public.has_scope('clients')));
create policy workout_logs_own_delete on public.workout_logs for delete to authenticated
  using (client_id = (select public.my_client_id()) or (select public.has_scope('clients')));

create policy set_logs_read on public.set_logs for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy set_logs_own on public.set_logs for insert to authenticated
  with check (client_id = (select public.my_client_id()) and public.client_has_access(client_id));
create policy set_logs_own_update on public.set_logs for update to authenticated
  using (client_id = (select public.my_client_id()) or (select public.has_scope('clients')))
  with check (client_id = (select public.my_client_id()) or (select public.has_scope('clients')));
create policy set_logs_own_delete on public.set_logs for delete to authenticated
  using (client_id = (select public.my_client_id()) or (select public.has_scope('clients')));

create policy personal_records_read on public.personal_records for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy personal_records_own on public.personal_records for insert to authenticated
  with check (client_id = (select public.my_client_id()) or (select public.has_scope('clients')));
create policy personal_records_staff on public.personal_records for delete to authenticated
  using ((select public.has_scope('clients')));

grant execute on function public.copy_block(uuid, uuid, uuid, date, text) to authenticated;
grant execute on function public.copy_week(uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- Datos de referencia
-- -----------------------------------------------------------------------------
insert into public.hyrox_stations (key, name, sort_order, default_distance_m, default_reps) values
  ('skierg', 'SkiErg', 1, 1000, null),
  ('sled_push', 'Sled Push', 2, 50, null),
  ('sled_pull', 'Sled Pull', 3, 50, null),
  ('burpee_broad_jumps', 'Burpee Broad Jumps', 4, 80, null),
  ('rowing', 'Rowing', 5, 1000, null),
  ('farmers_carry', 'Farmers Carry', 6, 200, null),
  ('sandbag_lunges', 'Sandbag Lunges', 7, 100, null),
  ('wall_balls', 'Wall Balls', 8, null, 100);

-- Biblioteca inicial (solo nombres y clasificación; vídeos e instrucciones los pone Jaime).
insert into public.exercises (name, modality, muscle_groups, equipment, tags) values
  ('Sentadilla trasera', 'gym', '{cuádriceps,glúteo}', '{barra}', '{básico}'),
  ('Sentadilla frontal', 'gym', '{cuádriceps,core}', '{barra}', '{}'),
  ('Sentadilla goblet', 'gym', '{cuádriceps,glúteo}', '{mancuerna,kettlebell}', '{casa}'),
  ('Peso muerto', 'gym', '{isquios,glúteo,espalda}', '{barra}', '{básico}'),
  ('Peso muerto rumano', 'gym', '{isquios,glúteo}', '{barra,mancuerna}', '{}'),
  ('Hip thrust', 'gym', '{glúteo}', '{barra}', '{}'),
  ('Zancada búlgara', 'gym', '{cuádriceps,glúteo}', '{mancuerna}', '{casa}'),
  ('Prensa de piernas', 'gym', '{cuádriceps}', '{máquina}', '{}'),
  ('Press banca', 'gym', '{pecho,tríceps}', '{barra}', '{básico}'),
  ('Press banca con mancuernas', 'gym', '{pecho,tríceps}', '{mancuerna}', '{}'),
  ('Press militar', 'gym', '{hombro,tríceps}', '{barra}', '{básico}'),
  ('Flexiones', 'gym', '{pecho,tríceps}', '{peso corporal}', '{casa}'),
  ('Dominadas', 'gym', '{espalda,bíceps}', '{barra fija}', '{básico}'),
  ('Remo con barra', 'gym', '{espalda}', '{barra}', '{}'),
  ('Remo con mancuerna', 'gym', '{espalda}', '{mancuerna}', '{casa}'),
  ('Jalón al pecho', 'gym', '{espalda}', '{polea}', '{}'),
  ('Curl de bíceps', 'gym', '{bíceps}', '{mancuerna}', '{}'),
  ('Extensión de tríceps en polea', 'gym', '{tríceps}', '{polea}', '{}'),
  ('Elevaciones laterales', 'gym', '{hombro}', '{mancuerna}', '{}'),
  ('Plancha', 'gym', '{core}', '{peso corporal}', '{casa}'),
  ('Kettlebell swing', 'functional', '{glúteo,isquios}', '{kettlebell}', '{}'),
  ('Thruster', 'functional', '{piernas,hombro}', '{barra,mancuerna}', '{}'),
  ('Burpees', 'functional', '{cuerpo completo}', '{peso corporal}', '{casa}'),
  ('Box jump', 'functional', '{piernas}', '{cajón}', '{}'),
  ('Wall ball', 'functional', '{piernas,hombro}', '{balón medicinal}', '{hyrox}'),
  ('Remo ergómetro', 'functional', '{cuerpo completo}', '{remoergómetro}', '{hyrox}'),
  ('Double unders', 'functional', '{gemelos}', '{comba}', '{}'),
  ('Rodaje suave', 'running', '{}', '{}', '{}'),
  ('Series', 'running', '{}', '{}', '{}'),
  ('Tempo run', 'running', '{}', '{}', '{}'),
  ('Fartlek', 'running', '{}', '{}', '{}'),
  ('Tirada larga', 'running', '{}', '{}', '{}'),
  ('SkiErg', 'hyrox', '{cuerpo completo}', '{skierg}', '{hyrox}'),
  ('Sled Push', 'hyrox', '{piernas}', '{trineo}', '{hyrox}'),
  ('Sled Pull', 'hyrox', '{espalda,piernas}', '{trineo}', '{hyrox}'),
  ('Burpee Broad Jumps', 'hyrox', '{cuerpo completo}', '{peso corporal}', '{hyrox}'),
  ('Farmers Carry', 'hyrox', '{agarre,core}', '{kettlebell}', '{hyrox}'),
  ('Sandbag Lunges', 'hyrox', '{piernas}', '{saco}', '{hyrox}');
