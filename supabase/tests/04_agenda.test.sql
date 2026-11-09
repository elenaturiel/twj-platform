-- Agenda: reservas con crédito, sin solapes, cancelación con/sin devolución,
-- créditos mensuales caducados que no restan, y aislamiento entre clientes.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000e1', 'e1@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e2', 'e2@test.local', 'authenticated', 'authenticated');
insert into public.clients (id, profile_id, status, plan_id, onboarding_completed_at)
select v.id::uuid, v.p::uuid, 'active', (select id from public.plans where key = 'mvp'), now()
from (values ('22000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e1'),
             ('22000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e2')) v(id, p);
-- Aislado de las citas de demo (todo se deshace con el rollback)
delete from public.session_credits where appointment_id is not null;
delete from public.appointments;

-- Un solo horario abierto para no depender del por defecto: lunes 18-21 h
delete from public.availability;
delete from public.availability_exceptions;
insert into public.availability (weekday, start_time, end_time) values (0, '18:00', '21:00');

-- Créditos de e1: 1 de directo vigente + 2 de un mes ya caducado (consumidos 1)
insert into public.session_credits (client_id, credit_type, delta, reason, period_start, expires_at) values
  ('22000000-0000-0000-0000-0000000000e1', 'live_training', 1, 'monthly_grant', current_date, now() + interval '20 days'),
  ('22000000-0000-0000-0000-0000000000e1', 'live_training', 2, 'monthly_grant', current_date - 40, now() - interval '10 days'),
  ('22000000-0000-0000-0000-0000000000e1', 'live_training', -1, 'consume', null, now() - interval '10 days');

-- Próximo lunes (al menos 2 días vista) a las 18:00 y 19:00 de Madrid
create temp table t_slot as
select ((date_trunc('week', (now() + interval '2 days') at time zone 'Europe/Madrid') + interval '7 days 18 hours')
        at time zone 'Europe/Madrid') as s1;
grant select on t_slot to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';

select is(public.client_credit_balance('22000000-0000-0000-0000-0000000000e1', 'live_training'), 1,
  'Los créditos de un mes caducado no restan del actual');
select throws_ok($$ insert into public.appointments (client_id, type_key, starts_at, ends_at)
  values ('22000000-0000-0000-0000-0000000000e1', 'live_training', now() + interval '3 days', now() + interval '3 days 1 hour') $$,
  '42501', null, 'No se pueden crear citas sin pasar por la reserva');
select throws_ok($$ select public.book_appointment('live_training', (select s1 + interval '30 minutes' from t_slot) - interval '7 days' - interval '1 day') $$,
  'P0001', null, 'Fuera del horario no se puede reservar');
select lives_ok($$ select public.book_appointment('live_training', (select s1 from t_slot)) $$, 'Reserva en un hueco libre');
select is(public.client_credit_balance('22000000-0000-0000-0000-0000000000e1', 'live_training'), 0, 'La reserva gasta un crédito');
select throws_ok($$ select public.book_appointment('live_training', (select s1 + interval '90 minutes' from t_slot)) $$,
  'P0001', 'No te quedan créditos para esta cita', 'Sin créditos no reserva');
select throws_ok($$ select public.book_appointment('live_training', (select s1 from t_slot), '22000000-0000-0000-0000-0000000000e2') $$,
  '42501', null, 'No puede reservar a nombre de otro');

-- Cancelación con antelación: devuelve el crédito
select is(public.cancel_appointment((select id from public.appointments limit 1)), true, 'Cancelar con antelación devuelve el crédito');
select is(public.client_credit_balance('22000000-0000-0000-0000-0000000000e1', 'live_training'), 1, 'El crédito vuelve al saldo');

-- e2 intenta el mismo hueco que e1 vuelve a reservar: solape imposible
select lives_ok($$ select public.book_appointment('live_training', (select s1 from t_slot)) $$, 'Vuelve a reservar');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
select is((select count(*)::int from public.appointments), 0, 'Otro cliente no ve citas ajenas');
reset role;
insert into public.session_credits (client_id, credit_type, delta, reason) values
  ('22000000-0000-0000-0000-0000000000e2', 'extra', 1, 'manual');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
select throws_ok($$ select public.book_appointment('live_training', (select s1 from t_slot)) $$,
  'P0001', 'Ese hueco ya no está disponible', 'Un hueco ocupado no se puede reservar');
select lives_ok($$ select public.book_appointment('live_training', (select s1 + interval '120 minutes' from t_slot) - interval '30 minutes') $$,
  'Usa una sesión extra cuando no tiene créditos de directo');

select * from finish();
rollback;
