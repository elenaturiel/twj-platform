-- Entrenamiento: el cliente no ve bloques en borrador ni sesiones ocultas, ni
-- puede escribir registros a nombre de otro.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000c1', 'c1@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c2', 'c2@test.local', 'authenticated', 'authenticated');
insert into public.clients (id, profile_id, status, plan_id, onboarding_completed_at)
select v.id::uuid, v.p::uuid, 'active', (select id from public.plans where key = 'rookie'), now()
from (values ('20000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1'),
             ('20000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c2')) v(id, p);

insert into public.workout_blocks (id, client_id, name, status, starts_on) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000c1', 'Publicado', 'active', current_date),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-0000000000c1', 'Borrador', 'draft', current_date);
insert into public.workout_weeks (id, block_id, client_id, week_index) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000c1', 0);
insert into public.workout_sessions (id, week_id, client_id, title, published) values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000c1', 'Visible', true),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000c1', 'Oculta', false);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';

select is((select array_agg(name order by name) from public.workout_blocks), array['Publicado'], 'El cliente no ve bloques en borrador');
select is((select array_agg(title order by title) from public.workout_sessions), array['Visible'], 'El cliente no ve sesiones ocultas');
select lives_ok($$ insert into public.workout_logs (id, client_id, title) values ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000c1', 'Mío') $$, 'El cliente registra su entreno');
select throws_ok($$ insert into public.workout_logs (id, client_id, title) values ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-0000000000c2', 'Ajeno') $$, '42501', null, 'No puede registrar entrenos de otro');
select throws_ok($$ insert into public.workout_blocks (client_id, name) values ('20000000-0000-0000-0000-0000000000c1', 'Hack') $$, '42501', null, 'El cliente no puede crearse bloques');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select is((select count(*)::int from public.workout_logs), 0, 'Otro cliente no ve ese entreno');

select * from finish();
rollback;
