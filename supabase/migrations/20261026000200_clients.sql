-- =============================================================================
-- TWJ · 0200 · Clientes, ficha de onboarding, salud, tutor, consentimientos,
--              cambios de ficha, notas y documentos
-- =============================================================================

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'past_due', 'paused', 'cancelled')),
  plan_id uuid, -- FK añadida en 0300 (plans)
  billing_mode text not null default 'stripe' check (billing_mode in ('stripe', 'manual')),
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  modalities text[] not null default '{}'
    check (modalities <@ array['gym', 'functional', 'running', 'hyrox']::text[]),
  tags text[] not null default '{}',
  referral_code text unique,
  stripe_customer_id text unique,
  is_minor boolean not null default false,
  guardian_status text not null default 'not_required'
    check (guardian_status in ('not_required', 'pending', 'confirmed')),
  onboarding_completed_at timestamptz,
  checkin_frequency_days smallint check (checkin_frequency_days between 1 and 60),
  checkin_weekday smallint check (checkin_weekday between 0 and 6),
  last_activity_at timestamptz,
  started_at date,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_status_idx on public.clients (status);
create index clients_plan_idx on public.clients (plan_id);
create index clients_tags_idx on public.clients using gin (tags);
create trigger clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger clients_audit after insert or update or delete on public.clients
  for each row execute function public.audit_row();

comment on table public.clients is 'Estado comercial del cliente. Solo staff (o sistema) puede modificarla.';

-- id del cliente del usuario actual
create or replace function public.my_client_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id from public.clients c where c.profile_id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- Ficha de onboarding: exactamente los campos acordados. El cliente la edita.
-- -----------------------------------------------------------------------------
create table public.client_intake (
  client_id uuid primary key references public.clients (id) on delete cascade,
  goal text,
  birth_date date,
  injuries text,
  experience text check (experience is null or experience in ('none', 'beginner', 'intermediate', 'advanced')),
  available_days smallint[] not null default '{}' check (available_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  equipment text check (equipment is null or equipment in ('gym', 'home', 'both')),
  equipment_notes text,
  allergens text[] not null default '{}',
  allergy_notes text,
  food_budget_cents integer check (food_budget_cents is null or food_budget_cents >= 0),
  food_budget_period text not null default 'week' check (food_budget_period in ('week', 'month')),
  class_schedule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger client_intake_updated_at before update on public.client_intake
  for each row execute function public.set_updated_at();
create trigger client_intake_audit after update on public.client_intake
  for each row execute function public.audit_row();

-- Cuestionario de salud (tipo PAR-Q). Preguntas versionadas en settings/legal.
create table public.health_screenings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  version text not null,
  answers jsonb not null,
  has_flags boolean not null default false,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index health_screenings_client_idx on public.health_screenings (client_id, created_at desc);
create trigger health_screenings_audit after insert or update on public.health_screenings
  for each row execute function public.audit_row();

-- Llamada de onboarding (solo staff)
create table public.onboarding_calls (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  held_at timestamptz,
  notes text,
  agreed_goals text,
  metrics_to_track text,
  initial_blocks text,
  observations text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index onboarding_calls_client_idx on public.onboarding_calls (client_id);
create trigger onboarding_calls_updated_at before update on public.onboarding_calls
  for each row execute function public.set_updated_at();

-- Notas privadas (solo staff)
create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  author_id uuid references public.profiles (id),
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index client_notes_client_idx on public.client_notes (client_id, created_at desc);
create trigger client_notes_updated_at before update on public.client_notes
  for each row execute function public.set_updated_at();

-- Autorización del tutor legal (menores)
create table public.guardian_authorizations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  guardian_name text not null,
  guardian_email extensions.citext not null,
  token_hash text not null unique,
  sent_at timestamptz,
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  confirmed_ip inet,
  created_at timestamptz not null default now()
);
create index guardian_authorizations_client_idx on public.guardian_authorizations (client_id);
create trigger guardian_authorizations_audit after insert or update on public.guardian_authorizations
  for each row execute function public.audit_row();

-- -----------------------------------------------------------------------------
-- Documentos legales versionados y consentimientos (append-only)
-- -----------------------------------------------------------------------------
create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('privacy', 'legal_notice', 'terms', 'cookies', 'health_data', 'progress_photos', 'marketing', 'guardian', 'health_screening')),
  version text not null,
  title text not null,
  body_md text not null,
  is_draft boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (kind, version)
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('terms', 'privacy', 'health_data', 'progress_photos', 'marketing', 'cookies', 'guardian')),
  granted boolean not null,
  document_version text not null,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index consents_profile_kind_idx on public.consents (profile_id, kind, created_at desc);

-- Estado vigente: último registro por tipo
create view public.current_consents
with (security_invoker = true) as
select distinct on (profile_id, kind) profile_id, kind, granted, document_version, created_at
from public.consents
order by profile_id, kind, created_at desc;

-- -----------------------------------------------------------------------------
-- Documentos del cliente (pestaña "Consentimientos y documentos")
-- -----------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  kind text not null default 'other' check (kind in ('consent', 'guardian', 'medical', 'invoice', 'other')),
  title text not null,
  storage_path text not null,
  uploaded_by uuid references public.profiles (id),
  visible_to_client boolean not null default true,
  created_at timestamptz not null default now()
);
create index documents_client_idx on public.documents (client_id);

-- -----------------------------------------------------------------------------
-- Cambios de ficha hechos por el cliente → profile_changes + aviso a staff
-- -----------------------------------------------------------------------------
create table public.profile_changes (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients (id) on delete cascade,
  changed_by uuid references public.profiles (id),
  table_name text not null,
  field text not null,
  old_value jsonb,
  new_value jsonb,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
create index profile_changes_client_idx on public.profile_changes (client_id, created_at desc);
create index profile_changes_pending_idx on public.profile_changes (created_at) where notified_at is null;

-- Registra cada campo modificado por el propio cliente (no por staff ni sistema).
-- El aviso a Jaime lo genera el worker de notificaciones agrupando por cliente,
-- para no mandar 8 emails si cambia 8 campos de golpe.
create or replace function public.track_client_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client uuid;
  v_old jsonb;
  v_new jsonb;
  k text;
begin
  if auth.uid() is null or public.is_staff() then
    return new;
  end if;

  if tg_table_name = 'profiles' then
    select c.id into v_client from public.clients c where c.profile_id = new.id;
  else
    v_client := new.client_id;
  end if;
  if v_client is null then
    return new;
  end if;

  v_old := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  v_new := to_jsonb(new);

  for k in select jsonb_object_keys(v_new) loop
    continue when k in ('updated_at', 'created_at', 'client_id', 'id', 'theme', 'avatar_path', 'timezone');
    if (v_new -> k) is distinct from (v_old -> k) then
      insert into public.profile_changes (client_id, changed_by, table_name, field, old_value, new_value)
      values (v_client, auth.uid(), tg_table_name, k, v_old -> k, v_new -> k);
    end if;
  end loop;

  return new;
end;
$$;

create trigger client_intake_track_changes after update on public.client_intake
  for each row execute function public.track_client_changes();
create trigger profiles_track_changes after update on public.profiles
  for each row execute function public.track_client_changes();

-- -----------------------------------------------------------------------------
-- RLS y privilegios
-- -----------------------------------------------------------------------------
alter table public.clients enable row level security;
alter table public.client_intake enable row level security;
alter table public.health_screenings enable row level security;
alter table public.onboarding_calls enable row level security;
alter table public.client_notes enable row level security;
alter table public.guardian_authorizations enable row level security;
alter table public.legal_documents enable row level security;
alter table public.consents enable row level security;
alter table public.documents enable row level security;
alter table public.profile_changes enable row level security;

-- clients: el cliente solo lee su fila; staff con scope clients gestiona.
grant select, insert, update, delete on public.clients to authenticated;
create policy clients_select on public.clients for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_staff()));
create policy clients_write_staff on public.clients for all to authenticated
  using ((select public.has_scope('clients')))
  with check ((select public.has_scope('clients')));

-- client_intake: el cliente lee/crea/edita la suya.
grant select, insert, update on public.client_intake to authenticated;
create policy client_intake_select on public.client_intake for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy client_intake_insert on public.client_intake for insert to authenticated
  with check (client_id = (select public.my_client_id()) or (select public.has_scope('clients')));
create policy client_intake_update on public.client_intake for update to authenticated
  using (client_id = (select public.my_client_id()) or (select public.has_scope('clients')))
  with check (client_id = (select public.my_client_id()) or (select public.has_scope('clients')));

-- health_screenings: datos de salud → cliente (propio) y staff con scope health.
grant select, insert, update on public.health_screenings to authenticated;
create policy health_select on public.health_screenings for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.has_scope('health')));
create policy health_insert on public.health_screenings for insert to authenticated
  with check (client_id = (select public.my_client_id()));
create policy health_review on public.health_screenings for update to authenticated
  using ((select public.has_scope('health')))
  with check ((select public.has_scope('health')));

-- Solo staff
grant select, insert, update, delete on public.onboarding_calls, public.client_notes to authenticated;
create policy onboarding_calls_staff on public.onboarding_calls for all to authenticated
  using ((select public.has_scope('clients')))
  with check ((select public.has_scope('clients')));
create policy client_notes_staff on public.client_notes for all to authenticated
  using ((select public.has_scope('clients')))
  with check ((select public.has_scope('clients')));

-- Tutor: el cliente ve su solicitud (sin token); la crea/confirma el servidor.
grant select on public.guardian_authorizations to authenticated;
create policy guardian_select on public.guardian_authorizations for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));

-- Documentos legales: publicados son públicos; borradores solo staff.
grant select on public.legal_documents to anon, authenticated;
grant insert, update, delete on public.legal_documents to authenticated;
create policy legal_select on public.legal_documents for select to anon, authenticated
  using (not is_draft or (select public.is_staff()));
create policy legal_write on public.legal_documents for all to authenticated
  using ((select public.has_scope('settings')))
  with check ((select public.has_scope('settings')));

-- Consentimientos: los inserta el servidor (con IP); el usuario lee los suyos.
grant select on public.consents to authenticated;
grant select on public.current_consents to authenticated;
create policy consents_select on public.consents for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_staff()));

-- Documentos
grant select, insert, update, delete on public.documents to authenticated;
create policy documents_select on public.documents for select to authenticated
  using ((client_id = (select public.my_client_id()) and visible_to_client) or (select public.is_staff()));
create policy documents_write_staff on public.documents for all to authenticated
  using ((select public.has_scope('clients')))
  with check ((select public.has_scope('clients')));

-- Cambios de ficha: el cliente ve su historial; staff todo.
grant select on public.profile_changes to authenticated;
create policy profile_changes_select on public.profile_changes for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));

grant execute on function public.my_client_id() to authenticated;
