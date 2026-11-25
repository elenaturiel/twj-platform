-- =============================================================================
-- Fase 8 · RGPD: descarga de datos, solicitudes de supresión y anonimización.
-- Borrar del todo no es posible ni deseable: los pagos se conservan por
-- obligación fiscal. "Eliminar la cuenta" = anonimizar: se borran los datos
-- personales y de salud, se quitan nombre/email y se bloquea el acceso.
-- =============================================================================

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  kind text not null check (kind in ('export', 'delete')),
  status text not null default 'pending' check (status in ('pending', 'done', 'rejected')),
  reason text check (length(reason) <= 1000),
  processed_by uuid references public.profiles (id),
  processed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index data_requests_pending_idx on public.data_requests (created_at) where status = 'pending';

alter table public.data_requests enable row level security;
grant select, insert on public.data_requests to authenticated;
grant update (status, processed_by, processed_at, notes) on public.data_requests to authenticated;
create policy data_requests_own_read on public.data_requests for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.has_scope('team')));
create policy data_requests_own_insert on public.data_requests for insert to authenticated
  with check (profile_id = (select auth.uid()) and (status = 'pending' or kind = 'export'));
create policy data_requests_staff on public.data_requests for update to authenticated
  using ((select public.has_scope('team'))) with check ((select public.has_scope('team')));

-- Tablas con client_id que se CONSERVAN al anonimizar (obligación fiscal y contable)
create or replace function public.retained_client_tables()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['clients', 'payments', 'subscriptions', 'invoices_manual', 'discount_redemptions', 'referrals', 'squad_members', 'audit_log', 'data_requests'];
$$;

-- -----------------------------------------------------------------------------
-- Descarga de mis datos (derecho de acceso y portabilidad): JSON con todo lo
-- que tiene client_id = el mío, más perfil, consentimientos y avisos.
-- -----------------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_client uuid := public.my_client_id();
  v_out jsonb := '{}'::jsonb;
  t record;
  v_rows jsonb;
begin
  if v_uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  v_out := jsonb_build_object(
    'generado', now(),
    'perfil', (select to_jsonb(p) - 'role' from public.profiles p where p.id = v_uid),
    'consentimientos', coalesce((select jsonb_agg(to_jsonb(c) - 'ip') from public.consents c where c.profile_id = v_uid), '[]'::jsonb),
    'avisos', coalesce((select jsonb_agg(jsonb_build_object('fecha', n.created_at, 'titulo', n.title, 'texto', n.body)) from public.notifications n where n.profile_id = v_uid), '[]'::jsonb)
  );
  if v_client is not null then
    for t in
      select c.table_name
      from information_schema.columns c
      join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
      where c.table_schema = 'public' and c.column_name = 'client_id'
        and c.table_name not in ('audit_log', 'banner_events')
      order by c.table_name
    loop
      execute format('select coalesce(jsonb_agg(to_jsonb(x) - %L - %L), ''[]''::jsonb) from public.%I x where x.client_id = $1',
        'ip_hash', 'stripe_customer_id', t.table_name)
        into v_rows using v_client;
      if v_rows <> '[]'::jsonb then v_out := v_out || jsonb_build_object(t.table_name, v_rows); end if;
    end loop;
    v_out := v_out || jsonb_build_object('cliente', (select to_jsonb(cl) - 'stripe_customer_id' from public.clients cl where cl.id = v_client));
  end if;
  return v_out;
end;
$$;
grant execute on function public.export_my_data() to authenticated;

-- -----------------------------------------------------------------------------
-- Anonimizar un cliente. Solo desde el servidor (service_role), que antes
-- comprueba permisos y borra los ficheros de Storage.
-- -----------------------------------------------------------------------------
create or replace function public.anonymize_client(p_client uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile uuid;
  t record;
  v_pending text[] := '{}';
  v_pass int := 0;
begin
  select profile_id into v_profile from public.clients where id = p_client;
  if v_profile is null then raise exception 'Cliente no encontrado'; end if;

  -- Todo lo que cuelga del cliente salvo lo que se conserva. Varias pasadas por
  -- si alguna FK obliga a borrar en otro orden.
  select array_agg(c.table_name::text) into v_pending
  from information_schema.columns c
  join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
  where c.table_schema = 'public' and c.column_name = 'client_id'
    and not (c.table_name = any (public.retained_client_tables()));
  while cardinality(v_pending) > 0 and v_pass < 5 loop
    v_pass := v_pass + 1;
    for t in select unnest(v_pending) as table_name loop
      begin
        execute format('delete from public.%I where client_id = $1', t.table_name) using p_client;
        v_pending := array_remove(v_pending, t.table_name);
      exception when foreign_key_violation then
        null; -- se reintenta en la siguiente pasada
      end;
    end loop;
  end loop;
  if cardinality(v_pending) > 0 then
    raise exception 'No se pudo anonimizar: %', array_to_string(v_pending, ', ');
  end if;

  -- Del perfil: lo personal fuera
  delete from public.notifications where profile_id = v_profile;
  delete from public.notification_preferences where profile_id = v_profile;
  delete from public.push_subscriptions where profile_id = v_profile;
  update public.messages set body = null, attachment_path = null, attachment_type = null, deleted_at = coalesce(deleted_at, now())
  where sender_id = v_profile;
  update public.profiles
  set full_name = 'Cliente eliminado', email = 'eliminado+' || v_profile || '@twj.invalid', phone = null, avatar_path = null, deleted_at = now()
  where id = v_profile;
  update public.clients
  set status = 'cancelled', tags = '{}', modalities = '{}', referral_code = null, last_activity_at = null,
      cancelled_at = coalesce(cancelled_at, now())
  where id = p_client;

  insert into public.audit_log (actor_id, action, entity, entity_id, client_id, metadata)
  values (auth.uid(), 'anonymize', 'clients', p_client::text, p_client, jsonb_build_object('reason', 'rgpd'));
end;
$$;
revoke all on function public.anonymize_client(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_client(uuid) to service_role;

-- Clientes candidatos a anonimizar por plazo de conservación vencido
create or replace function public.retention_due_clients()
returns table (client_id uuid, cancelled_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.cancelled_at
  from public.clients c
  join public.profiles p on p.id = c.profile_id
  where c.status = 'cancelled' and p.deleted_at is null and c.cancelled_at is not null
    and c.cancelled_at < now() - make_interval(months => coalesce(
      (select (value #>> '{}')::int from public.settings where key = 'privacy.retention_months_after_cancel'), 24));
$$;
revoke all on function public.retention_due_clients() from public, anon, authenticated;
grant execute on function public.retention_due_clients() to service_role;
