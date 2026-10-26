-- Aislamiento entre clientes: el cliente A nunca puede leer ni escribir datos de B.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- ── Datos de prueba ───────────────────────────────────────────────────────────
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '{"full_name":"Cliente A"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', '{"full_name":"Cliente B"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local', '{"full_name":"Admin"}', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';

insert into public.clients (id, profile_id, status, plan_id)
select v.id::uuid, v.profile::uuid, 'active', (select id from public.plans where key = 'all_in')
from (values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b')
) v(id, profile);

insert into public.client_intake (client_id, goal) values
  ('10000000-0000-0000-0000-00000000000a', 'Objetivo A'),
  ('10000000-0000-0000-0000-00000000000b', 'Objetivo B');
insert into public.health_screenings (client_id, version, answers) values
  ('10000000-0000-0000-0000-00000000000b', 'v1', '{}');
insert into public.client_notes (client_id, body) values
  ('10000000-0000-0000-0000-00000000000b', 'Nota privada de B');
insert into public.subscriptions (client_id, plan_id, billing_mode, status, list_price_cents, amount_cents)
values ('10000000-0000-0000-0000-00000000000b', (select id from public.plans where key = 'all_in'), 'manual', 'active', 4490, 4490);
insert into public.payments (client_id, method, amount_cents, paid_at)
values ('10000000-0000-0000-0000-00000000000b', 'bizum', 4490, now());
insert into public.session_credits (client_id, credit_type, delta, reason)
values ('10000000-0000-0000-0000-00000000000b', 'live_training', 2, 'manual');

-- Función de apoyo: tablas con client_id en las que el usuario actual ve filas ajenas.
create function pg_temp.tables_leaking(p_own uuid) returns text[]
language plpgsql as $$
declare
  t text;
  n int;
  leaks text[] := '{}';
begin
  for t in
    select c.table_name from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'client_id' and tb.table_type = 'BASE TABLE'
  loop
    begin
      execute format('select count(*) from public.%I where client_id <> $1', t) into n using p_own;
      if n > 0 then leaks := leaks || t; end if;
    exception when insufficient_privilege then
      null; -- sin privilegio = sin fuga
    end;
  end loop;
  return leaks;
end $$;
grant execute on function pg_temp.tables_leaking(uuid) to authenticated;

-- ── Como cliente A ────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is(public.my_client_id(), '10000000-0000-0000-0000-00000000000a'::uuid, 'my_client_id() devuelve el cliente A');
select is(public.is_staff(), false, 'A no es staff');
select is(pg_temp.tables_leaking('10000000-0000-0000-0000-00000000000a'), '{}'::text[], 'Ninguna tabla con client_id muestra filas de otro cliente a A');
select is((select count(*)::int from public.clients), 1, 'A solo ve su fila de clients');
select is((select count(*)::int from public.profiles), 1, 'A solo ve su perfil');
select is((select goal from public.client_intake), 'Objetivo A', 'A ve su propia ficha');

-- Escrituras prohibidas
select throws_ok(
  $$ insert into public.client_intake (client_id, goal) values ('10000000-0000-0000-0000-00000000000b', 'hack') on conflict (client_id) do update set goal = 'hack' $$,
  '42501', null, 'A no puede escribir la ficha de B'
);
update public.client_intake set goal = 'hack' where client_id = '10000000-0000-0000-0000-00000000000b';
select is((select count(*)::int from public.profile_changes where new_value = '"hack"'::jsonb), 0, 'El update sobre la ficha de B no afecta a ninguna fila');

update public.clients set status = 'active', plan_id = (select id from public.plans where key = 'peak') where id = '10000000-0000-0000-0000-00000000000a';
reset role;
select is((select p.key from public.clients c join public.plans p on p.id = c.plan_id where c.id = '10000000-0000-0000-0000-00000000000a'), 'all_in', 'A no puede cambiarse de plan');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select throws_ok(
  $$ update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null, 'A no puede cambiarse el rol'
);
select throws_ok(
  $$ insert into public.payments (client_id, method, amount_cents) values ('10000000-0000-0000-0000-00000000000a', 'cash', 1) $$,
  '42501', null, 'A no puede registrarse pagos'
);
select is(public.client_credit_balance('10000000-0000-0000-0000-00000000000b', 'live_training'), 0, 'A no puede consultar los créditos de B');
select is(public.has_feature('10000000-0000-0000-0000-00000000000b', 'chat'), false, 'A no puede consultar las funciones de B');
select is((select count(*)::int from public.audit_log), 0, 'A no ve el registro de auditoría');

-- Cambio legítimo de su ficha → profile_changes
update public.client_intake set goal = 'Correr una media' where client_id = '10000000-0000-0000-0000-00000000000a';
select is((select count(*)::int from public.profile_changes where client_id = '10000000-0000-0000-0000-00000000000a' and field = 'goal'), 1, 'El cambio de A queda en profile_changes');

-- ── Como admin ────────────────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
select is(public.is_staff(), true, 'admin es staff');
select is((select count(*)::int from public.clients), 2, 'admin ve todos los clientes');
select is((select count(*)::int from public.health_screenings), 0, 'admin sin scope health no ve datos de salud');
reset role;
insert into public.staff_permissions (profile_id, scope) values ('00000000-0000-0000-0000-0000000000ad', 'health');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
select is((select count(*)::int from public.health_screenings), 1, 'admin con scope health ve datos de salud');

-- ── Anónimo ───────────────────────────────────────────────────────────────────
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*)::int from public.public_plans where key = 'peak' and price_cents is null), 1, 'anon ve Peak sin precio');

select * from finish();
rollback;
