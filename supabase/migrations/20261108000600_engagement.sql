-- =============================================================================
-- Fase 7 · Retos, rachas, medallas, squad y lista de espera HYROX.
-- La lógica de rachas/retos/medallas está en src/domain/engagement (puras + tests);
-- aquí solo el almacenamiento y lo que debe ser atómico o público.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Medallas
-- -----------------------------------------------------------------------------
create table public.badges (
  key text primary key check (key ~ '^[a-z0-9_]{2,60}$'),
  name text not null,
  description text not null,
  icon text not null default 'medal',           -- nombre de icono (lucide) o emoji
  kind text not null check (kind in ('milestone', 'streak', 'challenge', 'pr')),
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.client_badges (
  client_id uuid not null references public.clients (id) on delete cascade,
  badge_key text not null references public.badges (key) on delete cascade,
  awarded_at timestamptz not null default now(),
  source_id uuid,                               -- reto que la dio, si aplica
  seen_at timestamptz,                          -- para lanzar la animación una sola vez
  primary key (client_id, badge_key)
);

insert into public.badges (key, name, description, icon, kind, sort_order) values
  ('first_workout', 'Primer entreno', 'Registraste tu primer entreno en la app.', '🔥', 'milestone', 10),
  ('workouts_10', '10 entrenos', 'Diez entrenos registrados. Ya no es casualidad.', '💪', 'milestone', 20),
  ('workouts_50', '50 entrenos', 'Cincuenta entrenos. Esto es constancia.', '🏋️', 'milestone', 30),
  ('workouts_100', '100 entrenos', 'Cien entrenos registrados. Leyenda.', '🏆', 'milestone', 40),
  ('first_pr', 'Primer récord', 'Batiste tu primera marca personal.', '⚡', 'pr', 50),
  ('prs_10', '10 récords', 'Diez marcas personales batidas.', '🚀', 'pr', 60),
  ('streak_4', 'Racha de 4 semanas', 'Cuatro semanas seguidas cumpliendo el plan (≥ 80 %).', '⭐', 'streak', 70),
  ('streak_8', 'Racha de 8 semanas', 'Ocho semanas seguidas cumpliendo el plan.', '🌟', 'streak', 80),
  ('streak_12', 'Racha de 12 semanas', 'Doce semanas seguidas. Un trimestre impecable.', '👑', 'streak', 90),
  ('checkins_4', 'Check-ins al día', 'Cuatro check-ins seguidos entregados a tiempo.', '✅', 'streak', 100),
  ('live_session', 'En directo', 'Tu primer entreno en directo con Jaime.', '🎥', 'milestone', 110),
  ('challenge_done', 'Reto superado', 'Completaste un reto.', '🎯', 'challenge', 120);

-- -----------------------------------------------------------------------------
-- Rachas (calculadas en el servidor; se guardan para squad y panel)
-- -----------------------------------------------------------------------------
create table public.client_streaks (
  client_id uuid primary key references public.clients (id) on delete cascade,
  training_weeks smallint not null default 0,   -- semanas seguidas con ≥ 80 % hecho
  best_training_weeks smallint not null default 0,
  checkin_streak smallint not null default 0,
  best_checkin_streak smallint not null default 0,
  week_done smallint not null default 0,        -- sesiones hechas esta semana
  week_planned smallint not null default 0,
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Retos
-- -----------------------------------------------------------------------------
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 2 and 120),
  description text,
  starts_on date not null,
  ends_on date not null,
  -- {"type":"workouts_count","target":12} | {"type":"checkins_count","target":4}
  -- {"type":"metric_total","metric":"steps","target":300000} | {"type":"prs_count","target":3}
  -- {"type":"live_sessions","target":2}
  rule jsonb not null,
  badge_key text references public.badges (key),
  plan_keys text[] not null default '{}',       -- vacío = todos los planes
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (rule ? 'type' and rule ? 'target')
);

create table public.challenge_participants (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  joined_at timestamptz not null default now(),
  progress numeric not null default 0,
  completed_at timestamptz,
  primary key (challenge_id, client_id)
);
create index challenge_participants_client_idx on public.challenge_participants (client_id);

-- Unirse a un reto activo (el cliente, para sí mismo)
create or replace function public.join_challenge(p_challenge uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client uuid := public.my_client_id();
  c public.challenges;
  v_plan text;
begin
  if v_client is null or not public.client_has_access(v_client) then
    raise exception 'Sin acceso' using errcode = '42501';
  end if;
  select * into c from public.challenges where id = p_challenge and is_active;
  if c.id is null or c.ends_on < (now() at time zone 'Europe/Madrid')::date then
    raise exception 'Este reto ya no está activo';
  end if;
  select p.key into v_plan from public.clients cl join public.plans p on p.id = cl.plan_id where cl.id = v_client;
  if cardinality(c.plan_keys) > 0 and not (v_plan = any (c.plan_keys)) then
    raise exception 'Este reto es para otros planes';
  end if;
  insert into public.challenge_participants (challenge_id, client_id) values (p_challenge, v_client)
  on conflict do nothing;
end;
$$;
grant execute on function public.join_challenge(uuid) to authenticated;

create or replace function public.leave_challenge(p_challenge uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.challenge_participants
  where challenge_id = p_challenge and client_id = public.my_client_id() and completed_at is null;
$$;
grant execute on function public.leave_challenge(uuid) to authenticated;

-- Clasificación de un reto: nombre de pila + progreso (sin más datos personales)
create or replace function public.challenge_leaderboard(p_challenge uuid)
returns table (first_name text, progress numeric, completed boolean, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select split_part(pr.full_name, ' ', 1), cp.progress, cp.completed_at is not null, cp.client_id = public.my_client_id()
  from public.challenge_participants cp
  join public.clients cl on cl.id = cp.client_id
  join public.profiles pr on pr.id = cl.profile_id
  where cp.challenge_id = p_challenge
    and auth.uid() is not null
    and (public.is_staff() or exists (
      select 1 from public.challenge_participants me where me.challenge_id = p_challenge and me.client_id = public.my_client_id()
    ))
  order by cp.progress desc, cp.completed_at nulls last
  limit 50;
$$;
grant execute on function public.challenge_leaderboard(uuid) to authenticated;

-- Tu squad: nombres de pila y racha/semana de cada miembro (motivación, sin datos sensibles)
create or replace function public.my_squad_overview()
returns table (first_name text, is_me boolean, training_weeks smallint, week_done smallint, week_planned smallint, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select split_part(pr.full_name, ' ', 1), m.client_id = public.my_client_id(),
         coalesce(s.training_weeks, 0::smallint), coalesce(s.week_done, 0::smallint), coalesce(s.week_planned, 0::smallint), m.joined_at
  from public.squad_members mine
  join public.squad_members m on m.squad_id = mine.squad_id and m.left_at is null
  join public.clients cl on cl.id = m.client_id
  join public.profiles pr on pr.id = cl.profile_id
  left join public.client_streaks s on s.client_id = m.client_id
  where mine.client_id = public.my_client_id() and mine.left_at is null
  order by m.joined_at;
$$;
grant execute on function public.my_squad_overview() to authenticated;

-- -----------------------------------------------------------------------------
-- HYROX: eventos, lista de espera (compatible con el formulario de la web),
-- eventos del embudo/banner y envíos masivos.
-- -----------------------------------------------------------------------------
create table public.hyrox_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  event_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
-- TODO(Jaime): ciudad y nombre exacto de la prueba del 14-11-2026
insert into public.hyrox_events (name, city, event_date) values ('HYROX', null, '2026-11-14');

create table public.waitlist_hyrox (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique check (length(session_id) between 8 and 64), -- id del navegador (la web lo genera)
  event_id uuid references public.hyrox_events (id) on delete set null,
  email extensions.citext,
  nivel text check (nivel in ('nunca', 'gimnasio', 'competido')),
  cuando text check (cuando in ('3m', '3-6m', 'mas-adelante', 'curioseando')),
  ubicacion text,                               -- banner: barra, home, planes, footer, directo, app…
  utm jsonb not null default '{}'::jsonb,
  utm_source text generated always as (utm ->> 'utm_source') stored,
  consent_at timestamptz,
  consent_version text,
  source text not null default 'web' check (source in ('web', 'app', 'manual')),
  status text not null default 'lead' check (status in ('lead', 'subscribed', 'contacted', 'converted', 'unsubscribed')),
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  ip_hash text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index waitlist_hyrox_email_idx on public.waitlist_hyrox (email) where email is not null;
create trigger waitlist_hyrox_updated_at before update on public.waitlist_hyrox
  for each row execute function public.set_updated_at();

create table public.banner_events (
  id bigint generated always as identity primary key,
  banner_key text not null default 'hyrox',
  event text not null check (event in ('vista', 'paso1', 'paso2', 'envio', 'view', 'click')),
  session_hash text,
  ubicacion text,
  utm_source text,
  referrer text,
  created_at timestamptz not null default now()
);
create index banner_events_created_idx on public.banner_events (banner_key, created_at desc);

create table public.hyrox_mailings (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (length(subject) between 2 and 200),
  body text not null check (length(body) between 10 and 10000),
  filter jsonb not null default '{}'::jsonb,    -- {"nivel":[...],"cuando":[...]}
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent')),
  total integer not null default 0,
  sent integer not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create table public.hyrox_mailing_recipients (
  mailing_id uuid not null references public.hyrox_mailings (id) on delete cascade,
  waitlist_id uuid not null references public.waitlist_hyrox (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  sent_at timestamptz,
  error text,
  primary key (mailing_id, waitlist_id)
);

-- Captura progresiva desde el formulario (web o app). Público (anon), con
-- límites: tamaño de campos, 40 escrituras/10 min por IP y sin pisar el email
-- de otra sesión. Devuelve true si se guardó.
create or replace function public.hyrox_capture(
  p_session text,
  p_ub text default null,
  p_nivel text default null,
  p_cuando text default null,
  p_email text default null,
  p_consent boolean default false,
  p_utm jsonb default '{}'::jsonb,
  p_ip_hash text default null,
  p_source text default 'web'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event uuid;
  v_email text := nullif(lower(trim(p_email)), '');
  v_prev text;
begin
  if p_session is null or length(p_session) not between 8 and 64 then return false; end if;
  if v_email is not null and (length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or not coalesce(p_consent, false)) then
    return false;
  end if;
  if p_ip_hash is not null and (
    select count(*) from public.waitlist_hyrox w where w.ip_hash = p_ip_hash and w.updated_at > now() - interval '10 minutes'
  ) > 40 then
    return false;
  end if;
  select id into v_event from public.hyrox_events where is_active order by event_date limit 1;
  select email into v_prev from public.waitlist_hyrox where session_id = p_session;

  insert into public.waitlist_hyrox (session_id, event_id, email, nivel, cuando, ubicacion, utm, consent_at, consent_version, source, status, ip_hash)
  values (
    p_session, v_event, v_email,
    case when p_nivel in ('nunca', 'gimnasio', 'competido') then p_nivel end,
    case when p_cuando in ('3m', '3-6m', 'mas-adelante', 'curioseando') then p_cuando end,
    left(p_ub, 40), coalesce(p_utm, '{}'::jsonb),
    case when v_email is not null then now() end,
    case when v_email is not null then 'hyrox-2026' end,
    case when p_source in ('web', 'app') then p_source else 'web' end,
    case when v_email is not null then 'subscribed' else 'lead' end,
    p_ip_hash
  )
  on conflict (session_id) do update set
    nivel = coalesce(excluded.nivel, waitlist_hyrox.nivel),
    cuando = coalesce(excluded.cuando, waitlist_hyrox.cuando),
    ubicacion = coalesce(waitlist_hyrox.ubicacion, excluded.ubicacion),
    utm = case when waitlist_hyrox.utm = '{}'::jsonb then excluded.utm else waitlist_hyrox.utm end,
    email = coalesce(excluded.email, waitlist_hyrox.email),
    consent_at = coalesce(waitlist_hyrox.consent_at, excluded.consent_at),
    consent_version = coalesce(waitlist_hyrox.consent_version, excluded.consent_version),
    status = case when excluded.email is not null and waitlist_hyrox.status in ('lead', 'unsubscribed') then 'subscribed' else waitlist_hyrox.status end,
    ip_hash = excluded.ip_hash;

  if v_email is not null and v_prev is distinct from v_email then
    perform public.notify_staff('hyrox_signup', 'Nuevo apuntado a la lista HYROX', v_email, '/panel/hyrox', null);
  end if;
  return true;
end;
$$;

create or replace function public.hyrox_track(p_event text, p_ub text default null, p_utm_source text default null, p_session text default null, p_referrer text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.banner_events (event, ubicacion, utm_source, session_hash, referrer)
  select p_event, left(p_ub, 40), left(p_utm_source, 100), left(p_session, 64), left(p_referrer, 300)
  where p_event in ('vista', 'paso1', 'paso2', 'envio', 'view', 'click');
$$;

-- Baja con el enlace del email
create or replace function public.hyrox_unsubscribe(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.waitlist_hyrox set status = 'unsubscribed' where unsubscribe_token = p_token and status <> 'unsubscribed';
  return found or exists (select 1 from public.waitlist_hyrox where unsubscribe_token = p_token);
end;
$$;

grant execute on function public.hyrox_capture(text, text, text, text, text, boolean, jsonb, text, text) to anon, authenticated;
grant execute on function public.hyrox_track(text, text, text, text, text) to anon, authenticated;
grant execute on function public.hyrox_unsubscribe(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.badges enable row level security;
alter table public.client_badges enable row level security;
alter table public.client_streaks enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.hyrox_events enable row level security;
alter table public.waitlist_hyrox enable row level security;
alter table public.banner_events enable row level security;
alter table public.hyrox_mailings enable row level security;
alter table public.hyrox_mailing_recipients enable row level security;

grant select on public.badges to authenticated;
grant insert, update, delete on public.badges to authenticated;
create policy badges_read on public.badges for select to authenticated using (true);
create policy badges_write on public.badges for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));

-- Las medallas las da el servidor; el cliente solo marca "vista"
grant select on public.client_badges to authenticated;
grant update (seen_at) on public.client_badges to authenticated;
grant insert, delete on public.client_badges to authenticated;
create policy client_badges_read on public.client_badges for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy client_badges_seen on public.client_badges for update to authenticated
  using (client_id = (select public.my_client_id())) with check (client_id = (select public.my_client_id()));
create policy client_badges_staff on public.client_badges for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));

grant select on public.client_streaks to authenticated;
create policy client_streaks_read on public.client_streaks for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));

grant select on public.challenges to authenticated;
grant insert, update, delete on public.challenges to authenticated;
create policy challenges_read on public.challenges for select to authenticated
  using (is_active or (select public.is_staff()));
create policy challenges_write on public.challenges for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));

grant select on public.challenge_participants to authenticated;
create policy challenge_participants_read on public.challenge_participants for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));

grant select on public.hyrox_events to anon, authenticated;
grant insert, update, delete on public.hyrox_events to authenticated;
create policy hyrox_events_read on public.hyrox_events for select to anon, authenticated using (is_active or (select public.is_staff()));
create policy hyrox_events_write on public.hyrox_events for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));

-- Lista, eventos y envíos: solo el equipo (lo público entra por las funciones de arriba)
grant select, update, delete on public.waitlist_hyrox to authenticated;
create policy waitlist_hyrox_staff on public.waitlist_hyrox for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
grant select on public.banner_events to authenticated;
create policy banner_events_staff on public.banner_events for select to authenticated using ((select public.has_scope('clients')));
grant select, insert on public.hyrox_mailings, public.hyrox_mailing_recipients to authenticated;
create policy hyrox_mailings_staff on public.hyrox_mailings for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy hyrox_mailing_recipients_staff on public.hyrox_mailing_recipients for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));

insert into public.settings (key, value, is_public, description) values
  ('hyrox.allowed_origins', '["https://www.trainwithjaime.es", "https://trainwithjaime.es"]', false, 'Webs que pueden enviar el formulario HYROX a la app (CORS)')
on conflict (key) do nothing;

-- Orígenes permitidos para el endpoint público (sin exponer el resto de ajustes)
create or replace function public.hyrox_allowed_origins()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select value from public.settings where key = 'hyrox.allowed_origins';
$$;
grant execute on function public.hyrox_allowed_origins() to anon, authenticated;
