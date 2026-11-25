-- =============================================================================
-- Fase 5 · Agenda: tipos de cita, disponibilidad, excepciones, citas (videollamada
-- o presencial), créditos con caducidad por "cubo", Google Calendar/Meet.
-- Horas de disponibilidad en hora de Madrid. 0 = lunes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Créditos: cada consumo/devolución copia la caducidad del cubo del que sale,
-- así un crédito mensual caducado no "resta" del mes siguiente.
-- -----------------------------------------------------------------------------
update public.session_credits
set expires_at = ((period_start + interval '1 month')::timestamp at time zone 'Europe/Madrid')
where reason = 'monthly_grant' and expires_at is null and period_start is not null;

create or replace function public.client_credit_balance(p_client_id uuid, p_type text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(delta), 0)::int
  from public.session_credits
  where client_id = p_client_id
    and (p_client_id = public.my_client_id() or public.is_staff() or auth.uid() is null)
    and credit_type = p_type
    and (expires_at is null or expires_at > now());
$$;

-- -----------------------------------------------------------------------------
-- Tipos de cita
-- -----------------------------------------------------------------------------
create table public.appointment_types (
  key text primary key check (key ~ '^[a-z_]{2,40}$'),
  name text not null,
  description text,
  modality text not null default 'online' check (modality in ('online', 'in_person')),
  location text,                              -- solo presenciales
  duration_min smallint not null check (duration_min between 10 and 240),
  credit_types text[] not null default '{}',  -- orden de consumo; vacío = no gasta créditos
  feature_key text references public.features (key), -- plan necesario para reservarla
  min_notice_h smallint not null default 24 check (min_notice_h >= 0),
  cancel_notice_h smallint not null default 12 check (cancel_notice_h >= 0),
  buffer_min smallint not null default 15 check (buffer_min >= 0),
  bookable_by_client boolean not null default true,
  available_from date,                        -- p. ej. presenciales desde enero 2027
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

insert into public.appointment_types
  (key, name, description, modality, location, duration_min, credit_types, feature_key, bookable_by_client, available_from, sort_order)
values
  ('live_training', 'Entreno en directo', 'Entrenas con Jaime por videollamada: técnica, ritmo y correcciones en el momento.',
   'online', null, 60, array['live_training', 'extra'], 'live_sessions', true, null, 10),
  ('monthly_call', 'Videollamada mensual', 'Repaso del mes con Jaime: cómo vas, qué ajustar y siguientes objetivos.',
   'online', null, 30, array['monthly_call'], 'monthly_call', true, null, 20),
  ('kickoff', 'Sesión de arranque', 'Sesión 1:1 de 45 minutos para arrancar tu preparación.',
   'online', null, 45, '{}', 'kickoff_session', true, null, 30),
  -- TODO(Jaime): confirmar dirección y si la presencial gasta créditos de directo o se paga aparte
  ('in_person', 'Sesión presencial', 'Entreno presencial en Pamplona.',
   'in_person', 'Pamplona', 60, array['live_training', 'extra'], 'live_sessions', true, '2027-01-01', 40);

-- -----------------------------------------------------------------------------
-- Disponibilidad semanal y excepciones (vacaciones, huecos extra)
-- -----------------------------------------------------------------------------
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  type_keys text[] not null default '{}',     -- vacío = vale para todos los tipos
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind text not null default 'blocked' check (kind in ('blocked', 'extra')),
  reason text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index availability_exceptions_range_idx on public.availability_exceptions (starts_at, ends_at);

-- Horario por defecto (orientativo): TODO(Jaime) ajustar en Panel → Agenda → Disponibilidad
insert into public.availability (weekday, start_time, end_time) values
  (0, '07:00', '09:00'), (0, '18:00', '21:00'),
  (1, '18:00', '21:00'),
  (2, '07:00', '09:00'), (2, '18:00', '21:00'),
  (3, '18:00', '21:00'),
  (4, '07:00', '09:00'), (4, '16:00', '19:00'),
  (5, '09:00', '12:00');

-- -----------------------------------------------------------------------------
-- Citas
-- -----------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  type_key text not null references public.appointment_types (key),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  modality text not null default 'online' check (modality in ('online', 'in_person')),
  location text,
  meet_url text check (meet_url is null or meet_url ~ '^https://'),
  google_event_id text,
  credit_type text,                           -- de qué cubo salió el crédito (null = sin crédito)
  client_notes text check (length(client_notes) <= 1000),
  staff_notes text,
  summary text,                               -- resumen de la sesión (visible para el cliente)
  goals text[] not null default '{}',         -- 3 objetivos tras la sesión
  created_by uuid references public.profiles (id),
  cancelled_by uuid references public.profiles (id),
  cancelled_at timestamptz,
  cancel_reason text,
  late_cancel boolean not null default false,
  reminder_24h_at timestamptz,
  reminder_1h_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Nunca dos citas confirmadas solapadas (protege de reservas simultáneas)
  constraint appointments_no_overlap exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
    where (status = 'confirmed')
);
create index appointments_client_idx on public.appointments (client_id, starts_at desc);
create index appointments_starts_idx on public.appointments (starts_at) where status = 'confirmed';
create trigger appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

alter table public.session_credits
  add constraint session_credits_appointment_fk foreign key (appointment_id)
  references public.appointments (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Google Calendar (cuenta de Jaime). El refresh token vive en Vault.
-- -----------------------------------------------------------------------------
create table public.google_connections (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  google_email text,
  calendar_id text not null default 'primary',
  vault_secret_id uuid,
  connected_at timestamptz not null default now()
);

create or replace function public.google_store_token(p_profile uuid, p_email text, p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret uuid;
begin
  select vault_secret_id into v_secret from public.google_connections where profile_id = p_profile;
  if v_secret is null then
    v_secret := vault.create_secret(p_token, 'google_refresh_' || p_profile::text);
  else
    perform vault.update_secret(v_secret, p_token);
  end if;
  insert into public.google_connections (profile_id, google_email, vault_secret_id)
  values (p_profile, p_email, v_secret)
  on conflict (profile_id) do update set google_email = excluded.google_email,
    vault_secret_id = excluded.vault_secret_id, connected_at = now();
end;
$$;

create or replace function public.google_get_token(p_profile uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  select s.decrypted_secret
  from public.google_connections g
  join vault.decrypted_secrets s on s.id = g.vault_secret_id
  where g.profile_id = p_profile;
$$;

create or replace function public.google_disconnect(p_profile uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret uuid;
begin
  delete from public.google_connections where profile_id = p_profile returning vault_secret_id into v_secret;
  if v_secret is not null then
    delete from vault.secrets where id = v_secret;
  end if;
end;
$$;

revoke all on function public.google_store_token(uuid, text, text) from public, anon, authenticated;
revoke all on function public.google_get_token(uuid) from public, anon, authenticated;
revoke all on function public.google_disconnect(uuid) from public, anon, authenticated;
grant execute on function public.google_store_token(uuid, text, text) to service_role;
grant execute on function public.google_get_token(uuid) to service_role;
grant execute on function public.google_disconnect(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- ¿El hueco está dentro de la disponibilidad y libre de bloqueos?
-- (La app calcula los huecos con la misma regla en src/domain/agenda/slots.ts.)
-- -----------------------------------------------------------------------------
create or replace function public.slot_is_open(p_type text, p_start timestamptz, p_end timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with local as (
    select (p_start at time zone 'Europe/Madrid') as s, (p_end at time zone 'Europe/Madrid') as e
  )
  select
    not exists (
      select 1 from public.availability_exceptions x
      where x.kind = 'blocked' and tstzrange(x.starts_at, x.ends_at) && tstzrange(p_start, p_end)
    )
    and (
      exists (
        select 1 from public.availability a, local
        where a.is_active
          and a.weekday = extract(isodow from local.s)::int - 1
          and local.s::date = local.e::date
          and local.s::time >= a.start_time
          and local.e::time <= a.end_time
          and (cardinality(a.type_keys) = 0 or p_type = any (a.type_keys))
      )
      or exists (
        select 1 from public.availability_exceptions x
        where x.kind = 'extra' and x.starts_at <= p_start and x.ends_at >= p_end
      )
    );
$$;

-- -----------------------------------------------------------------------------
-- Reservar: valida, consume crédito del cubo que caduca antes y crea la cita.
-- Cliente: solo para sí, con acceso, plan con la función, antelación y hueco libre.
-- Staff: para cualquiera y a cualquier hora; p_use_credit decide si gasta crédito.
-- -----------------------------------------------------------------------------
create or replace function public.book_appointment(
  p_type text,
  p_starts_at timestamptz,
  p_client_id uuid default null,
  p_notes text default null,
  p_use_credit boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff boolean := public.is_staff() or auth.uid() is null;
  v_client uuid := coalesce(p_client_id, public.my_client_id());
  t public.appointment_types;
  v_end timestamptz;
  v_credit_type text;
  v_expires timestamptz;
  v_id uuid;
  ct text;
begin
  if v_client is null then raise exception 'Cliente no encontrado'; end if;
  if not v_staff then
    if v_client <> public.my_client_id() then raise exception 'Sin permiso' using errcode = '42501'; end if;
    if not public.client_has_access(v_client) then raise exception 'Tu plan no está activo'; end if;
  end if;

  select * into t from public.appointment_types where key = p_type and is_active;
  if t.key is null then raise exception 'Tipo de cita no disponible'; end if;
  v_end := p_starts_at + make_interval(mins => t.duration_min);

  if not v_staff then
    if not t.bookable_by_client then raise exception 'Este tipo de cita lo agenda Jaime'; end if;
    if t.feature_key is not null and not public.has_feature(v_client, t.feature_key) then
      raise exception 'Tu plan no incluye esta cita';
    end if;
    if t.available_from is not null and p_starts_at < (t.available_from::timestamp at time zone 'Europe/Madrid') then
      raise exception 'Disponible a partir del %', to_char(t.available_from, 'DD/MM/YYYY');
    end if;
    if p_starts_at < now() + make_interval(hours => t.min_notice_h) then
      raise exception 'Hay que reservar con al menos % h de antelación', t.min_notice_h;
    end if;
    if not public.slot_is_open(p_type, p_starts_at, v_end) then
      raise exception 'Ese hueco ya no está disponible';
    end if;
    -- Margen entre citas
    if exists (
      select 1 from public.appointments a
      where a.status = 'confirmed'
        and tstzrange(a.starts_at - make_interval(mins => t.buffer_min), a.ends_at + make_interval(mins => t.buffer_min))
            && tstzrange(p_starts_at, v_end)
    ) then
      raise exception 'Ese hueco ya no está disponible';
    end if;
  end if;

  -- Serializa por cliente para no gastar dos veces el mismo crédito
  perform pg_advisory_xact_lock(hashtext('credits:' || v_client::text));

  if p_use_credit and cardinality(t.credit_types) > 0 then
    foreach ct in array t.credit_types loop
      select c.expires_at into v_expires
      from public.session_credits c
      where c.client_id = v_client and c.credit_type = ct and (c.expires_at is null or c.expires_at > now())
      group by c.expires_at
      having sum(c.delta) > 0
      order by c.expires_at nulls last
      limit 1;
      if found then
        v_credit_type := ct;
        exit;
      end if;
    end loop;
    if v_credit_type is null then
      raise exception 'No te quedan créditos para esta cita' using errcode = 'P0001', hint = 'no_credits';
    end if;
  end if;

  begin
    insert into public.appointments (client_id, type_key, starts_at, ends_at, modality, location, credit_type, client_notes, created_by)
    values (v_client, p_type, p_starts_at, v_end, t.modality, t.location, v_credit_type, nullif(trim(p_notes), ''), auth.uid())
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'Ese hueco ya no está disponible';
  end;

  if v_credit_type is not null then
    insert into public.session_credits (client_id, credit_type, delta, reason, expires_at, appointment_id, created_by)
    values (v_client, v_credit_type, -1, 'consume', v_expires, v_id, auth.uid());
  end if;
  return v_id;
end;
$$;

-- Cancelar: devuelve el crédito si se cancela con antelación (o si cancela el staff).
create or replace function public.cancel_appointment(p_id uuid, p_reason text default null)
returns boolean -- true si se devolvió el crédito
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff boolean := public.is_staff() or auth.uid() is null;
  a public.appointments;
  t public.appointment_types;
  v_refund boolean;
  c public.session_credits;
begin
  select * into a from public.appointments where id = p_id for update;
  if a.id is null or (not v_staff and a.client_id is distinct from public.my_client_id()) then
    raise exception 'Cita no encontrada';
  end if;
  if a.status <> 'confirmed' then raise exception 'La cita ya no está activa'; end if;
  if not v_staff and a.starts_at < now() then raise exception 'La cita ya ha empezado'; end if;
  select * into t from public.appointment_types where key = a.type_key;
  v_refund := v_staff or a.starts_at >= now() + make_interval(hours => t.cancel_notice_h);

  update public.appointments
  set status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now(),
      cancel_reason = nullif(trim(p_reason), ''), late_cancel = not v_refund
  where id = p_id;

  if v_refund and a.credit_type is not null then
    select * into c from public.session_credits
    where appointment_id = p_id and reason = 'consume' order by created_at desc limit 1;
    if c.id is not null then
      insert into public.session_credits (client_id, credit_type, delta, reason, expires_at, appointment_id, created_by)
      values (a.client_id, c.credit_type, 1, 'refund', c.expires_at, p_id, auth.uid());
    end if;
  end if;
  return v_refund and a.credit_type is not null;
end;
$$;

-- Reprogramar: mismo crédito, nueva hora (con las mismas reglas que reservar).
create or replace function public.reschedule_appointment(p_id uuid, p_starts_at timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff boolean := public.is_staff() or auth.uid() is null;
  a public.appointments;
  t public.appointment_types;
  v_end timestamptz;
begin
  select * into a from public.appointments where id = p_id for update;
  if a.id is null or (not v_staff and a.client_id is distinct from public.my_client_id()) then
    raise exception 'Cita no encontrada';
  end if;
  if a.status <> 'confirmed' then raise exception 'La cita ya no está activa'; end if;
  select * into t from public.appointment_types where key = a.type_key;
  v_end := p_starts_at + make_interval(mins => t.duration_min);
  if not v_staff then
    if a.starts_at < now() + make_interval(hours => t.cancel_notice_h) then
      raise exception 'Faltan menos de % h: ya no se puede mover (escríbele a Jaime)', t.cancel_notice_h;
    end if;
    if p_starts_at < now() + make_interval(hours => t.min_notice_h) then
      raise exception 'Hay que reservar con al menos % h de antelación', t.min_notice_h;
    end if;
    if not public.slot_is_open(a.type_key, p_starts_at, v_end) then
      raise exception 'Ese hueco ya no está disponible';
    end if;
    if exists (
      select 1 from public.appointments x
      where x.status = 'confirmed' and x.id <> p_id
        and tstzrange(x.starts_at - make_interval(mins => t.buffer_min), x.ends_at + make_interval(mins => t.buffer_min))
            && tstzrange(p_starts_at, v_end)
    ) then
      raise exception 'Ese hueco ya no está disponible';
    end if;
  end if;
  begin
    update public.appointments
    set starts_at = p_starts_at, ends_at = v_end, reminder_24h_at = null, reminder_1h_at = null
    where id = p_id;
  exception when exclusion_violation then
    raise exception 'Ese hueco ya no está disponible';
  end;
end;
$$;

grant execute on function public.slot_is_open(text, timestamptz, timestamptz) to authenticated;
grant execute on function public.book_appointment(text, timestamptz, uuid, text, boolean) to authenticated;
grant execute on function public.cancel_appointment(uuid, text) to authenticated;
grant execute on function public.reschedule_appointment(uuid, timestamptz) to authenticated;

-- Huecos ocupados (sin datos de quién) para que el cliente vea la agenda libre
create or replace function public.busy_ranges(p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.starts_at, a.ends_at from public.appointments a
  where a.status = 'confirmed' and a.starts_at < p_to and a.ends_at > p_from and auth.uid() is not null;
$$;
grant execute on function public.busy_ranges(timestamptz, timestamptz) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.appointment_types enable row level security;
alter table public.availability enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.appointments enable row level security;
alter table public.google_connections enable row level security;

grant select on public.appointment_types, public.availability, public.availability_exceptions to authenticated;
grant insert, update, delete on public.appointment_types, public.availability, public.availability_exceptions to authenticated;
create policy appointment_types_read on public.appointment_types for select to authenticated using (true);
create policy appointment_types_write on public.appointment_types for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy availability_read on public.availability for select to authenticated using (true);
create policy availability_write on public.availability for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy availability_exceptions_read on public.availability_exceptions for select to authenticated using (true);
create policy availability_exceptions_write on public.availability_exceptions for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));

-- Las citas se crean/cancelan por las funciones de arriba; staff edita notas y resumen.
grant select, update on public.appointments to authenticated;
create policy appointments_read on public.appointments for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy appointments_staff_update on public.appointments for update to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));

grant select on public.google_connections to authenticated;
create policy google_connections_read on public.google_connections for select to authenticated
  using ((select public.is_staff()));

-- -----------------------------------------------------------------------------
-- Ajustes
-- -----------------------------------------------------------------------------
insert into public.settings (key, value, is_public, description) values
  ('agenda.fallback_meet_url', 'null', false, 'Enlace de videollamada fijo si Google Calendar no está conectado (null = "Jaime te enviará el enlace")'),
  ('agenda.booking_horizon_days', '28', true, 'Días hacia delante que se pueden reservar'),
  ('agenda.slot_step_min', '30', false, 'Cada cuántos minutos empieza un hueco'),
  ('agenda.extra_credit_months', '3', false, 'Meses de validez de una sesión extra comprada')
on conflict (key) do nothing;
