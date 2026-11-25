-- Retos/medallas/HYROX: lo público entra solo por funciones; nadie lee la lista
-- salvo el equipo; el cliente no se da medallas; clasificación solo a participantes.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', 'a2@test.local', 'authenticated', 'authenticated');
update public.profiles set full_name = 'Ana Prueba' where id = '00000000-0000-0000-0000-0000000000a1';
insert into public.clients (id, profile_id, status, plan_id, onboarding_completed_at)
select v.id::uuid, v.p::uuid, 'active', (select id from public.plans where key = 'rookie'), now()
from (values ('25000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1'),
             ('25000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a2')) v(id, p);
insert into public.challenges (id, title, starts_on, ends_on, rule) values
  ('26000000-0000-0000-0000-000000000001', 'Reto test', current_date - 1, current_date + 10, '{"type":"workouts_count","target":5}'),
  ('26000000-0000-0000-0000-000000000002', 'Solo Peak', current_date - 1, current_date + 10, '{"type":"workouts_count","target":5}');
update public.challenges set plan_keys = array['peak'] where id = '26000000-0000-0000-0000-000000000002';

-- Público (anon)
set local role anon;
select is(public.hyrox_capture('test-session-0001', 'home', 'nunca', null, null, false, '{}', null, 'web'), true, 'El formulario público guarda un paso');
select is(public.hyrox_capture('test-session-0001', 'home', null, null, 'sin@consent.es', false, '{}', null, 'web'), false, 'Sin consentimiento no guarda el email');
select throws_ok($$ select count(*) from public.waitlist_hyrox $$, '42501', null, 'Anon no lee la lista');
select throws_ok($$ insert into public.banner_events (event) values ('vista') $$, '42501', null, 'Anon no escribe eventos directamente');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from public.waitlist_hyrox), 0, 'Un cliente no ve la lista HYROX');
select throws_ok($$ insert into public.client_badges (client_id, badge_key) values ('25000000-0000-0000-0000-0000000000a1', 'workouts_100') $$,
  '42501', null, 'El cliente no se da medallas');
select lives_ok($$ select public.join_challenge('26000000-0000-0000-0000-000000000001') $$, 'Se apunta a un reto abierto');
select throws_ok($$ select public.join_challenge('26000000-0000-0000-0000-000000000002') $$, 'P0001', 'Este reto es para otros planes', 'No entra en retos de otro plan');
select is((select first_name from public.challenge_leaderboard('26000000-0000-0000-0000-000000000001')), 'Ana', 'La clasificación muestra solo el nombre de pila');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select is((select count(*)::int from public.challenge_leaderboard('26000000-0000-0000-0000-000000000001')), 0, 'Quien no participa no ve la clasificación');

select * from finish();
rollback;
