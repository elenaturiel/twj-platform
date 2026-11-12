-- =============================================================================
-- TWJ · 0100 · Base: extensiones, perfiles, roles, permisos, ajustes y auditoría
-- =============================================================================

create extension if not exists citext with schema extensions;

-- Por defecto nadie (ni anon ni authenticated) tiene privilegios sobre tablas nuevas:
-- cada migración concede explícitamente lo que hace falta. RLS es la segunda barrera.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Perfiles (1:1 con auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'client' check (role in ('owner', 'admin', 'client')),
  full_name text not null default '',
  email extensions.citext not null,
  phone text,
  avatar_path text,
  timezone text not null default 'Europe/Madrid',
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index profiles_role_idx on public.profiles (role) where role <> 'client';
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

comment on table public.profiles is 'Perfil de cada usuario. role: owner (Jaime), admin (Elena), client.';

-- Permisos restringibles de admin. owner siempre tiene todos.
create table public.staff_permissions (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  scope text not null check (scope in ('clients', 'health', 'billing', 'business', 'settings', 'team')),
  created_at timestamptz not null default now(),
  primary key (profile_id, scope)
);

-- -----------------------------------------------------------------------------
-- Funciones de autorización (security definer: leen tablas con RLS sin recursión)
-- En las políticas se llaman como (select public.fn()) para que Postgres las
-- evalúe una sola vez por consulta.
-- -----------------------------------------------------------------------------
create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.deleted_at is null;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_role_name() in ('owner', 'admin'), false);
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_role_name() = 'owner', false);
$$;

create or replace function public.has_scope(p_scope text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.current_role_name()
    when 'owner' then true
    when 'admin' then exists (
      select 1 from public.staff_permissions sp
      where sp.profile_id = auth.uid() and sp.scope = p_scope
    )
    else false
  end;
$$;

-- -----------------------------------------------------------------------------
-- Alta automática de perfil al crear un usuario de Auth
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantener el email del perfil sincronizado con Auth
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- Ajustes clave/valor (WhatsApp, gracia, plazas fundador, recordatorios…)
-- -----------------------------------------------------------------------------
create table public.settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  description text,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Registro de auditoría (solo inserción)
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  client_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip inet,
  created_at timestamptz not null default now()
);
create index audit_log_client_idx on public.audit_log (client_id, created_at desc);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- Trigger genérico: registra INSERT/UPDATE/DELETE con el diff de columnas.
create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_changes jsonb := '{}'::jsonb;
  k text;
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(v_new) loop
      if k <> 'updated_at' and (v_new -> k) is distinct from (v_old -> k) then
        v_changes := v_changes || jsonb_build_object(k, jsonb_build_object('old', v_old -> k, 'new', v_new -> k));
      end if;
    end loop;
    if v_changes = '{}'::jsonb then
      return new;
    end if;
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, client_id, metadata)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    v_row ->> 'id',
    case
      when tg_table_name = 'clients' then (v_row ->> 'id')::uuid
      when v_row ? 'client_id' then (v_row ->> 'client_id')::uuid
    end,
    case tg_op when 'UPDATE' then jsonb_build_object('changes', v_changes) else '{}'::jsonb end
  );
  return coalesce(new, old);
end;
$$;

-- Registro de accesos desde la app (p. ej. staff abre la ficha de salud o fotos).
create or replace function public.log_access(p_entity text, p_entity_id text, p_client_id uuid, p_metadata jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, entity, entity_id, client_id, metadata)
  select auth.uid(), 'access', p_entity, p_entity_id, p_client_id, coalesce(p_metadata, '{}'::jsonb)
  where auth.uid() is not null;
$$;

create trigger profiles_audit after update of role, deleted_at on public.profiles
  for each row execute function public.audit_row();
create trigger staff_permissions_audit after insert or delete on public.staff_permissions
  for each row execute function public.audit_row();
create trigger settings_audit after insert or update or delete on public.settings
  for each row execute function public.audit_row();

-- -----------------------------------------------------------------------------
-- RLS y privilegios
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.staff_permissions enable row level security;
alter table public.settings enable row level security;
alter table public.audit_log enable row level security;

grant select on public.profiles to authenticated;
-- El usuario solo puede cambiar estas columnas de su propio perfil (no role ni email).
grant update (full_name, phone, avatar_path, timezone, theme) on public.profiles to authenticated;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
create policy profiles_update_staff on public.profiles for update to authenticated
  using ((select public.has_scope('clients')))
  with check ((select public.has_scope('clients')));

grant select, insert, delete on public.staff_permissions to authenticated;
create policy staff_permissions_select on public.staff_permissions for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.has_scope('team')));
create policy staff_permissions_write on public.staff_permissions for insert to authenticated
  with check ((select public.is_owner()));
create policy staff_permissions_delete on public.staff_permissions for delete to authenticated
  using ((select public.is_owner()));

grant select on public.settings to anon, authenticated;
grant insert, update, delete on public.settings to authenticated;
create policy settings_select_public on public.settings for select to anon, authenticated
  using (is_public or (select public.is_staff()));
create policy settings_write on public.settings for all to authenticated
  using ((select public.has_scope('settings')))
  with check ((select public.has_scope('settings')));

grant select on public.audit_log to authenticated;
create policy audit_log_select on public.audit_log for select to authenticated
  using ((select public.is_owner()));

grant execute on function public.current_role_name() to authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.has_scope(text) to authenticated;
grant execute on function public.log_access(text, text, uuid, jsonb) to authenticated;
