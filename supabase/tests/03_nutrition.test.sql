-- Nutrición: el cliente solo ve menús publicados (y su contenido), no edita alimentos
-- ni menús, y no ve listas ni notas de otros.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000d1', 'd1@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d2', 'd2@test.local', 'authenticated', 'authenticated');
insert into public.clients (id, profile_id, status, plan_id, onboarding_completed_at)
select v.id::uuid, v.p::uuid, 'active', (select id from public.plans where key = 'all_in'), now()
from (values ('21000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d1'),
             ('21000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d2')) v(id, p);

insert into public.foods (id, name, kcal, protein_g, carbs_g, fat_g) values
  ('71000000-0000-0000-0000-000000000001', 'Alimento test', 100, 10, 10, 1);
insert into public.meal_plans (id, client_id, week_start, status) values
  ('72000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-0000000000d1', '2026-11-02', 'published'),
  ('72000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-0000000000d1', '2026-11-09', 'draft');
insert into public.meal_plan_days (id, meal_plan_id, client_id, day_index) values
  ('73000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-0000000000d1', 0),
  ('73000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-0000000000d1', 0);
insert into public.meals (id, day_id, client_id, slot, title) values
  ('74000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-0000000000d1', 'lunch', 'Publicada'),
  ('74000000-0000-0000-0000-000000000002', '73000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-0000000000d1', 'lunch', 'Borrador');
insert into public.meal_items (meal_id, client_id, food_id, quantity_g) values
  ('74000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-0000000000d1', '71000000-0000-0000-0000-000000000001', 100),
  ('74000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-0000000000d1', '71000000-0000-0000-0000-000000000001', 200);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';

select is((select count(*)::int from public.meal_plans), 1, 'El cliente solo ve el menú publicado');
select is((select array_agg(title) from public.meals), array['Publicada'], 'No ve comidas de un borrador');
select is((select array_agg(quantity_g::int) from public.meal_items), array[100], 'No ve alimentos de un borrador');
select throws_ok($$ insert into public.foods (name) values ('Hack') $$, '42501', null, 'El cliente no crea alimentos');
select is((select count(*)::int from public.foods where name = 'Alimento test'), 1, 'El cliente lee la base de alimentos');
select lives_ok($$ insert into public.shopping_lists (client_id, meal_plan_id) values ('21000000-0000-0000-0000-0000000000d1', '72000000-0000-0000-0000-000000000001') $$, 'Genera su lista de la compra');
select lives_ok($$ insert into public.day_notes (client_id, date, author_id, body) values ('21000000-0000-0000-0000-0000000000d1', '2026-11-02', '00000000-0000-0000-0000-0000000000d1', 'Hoy como fuera') $$, 'Escribe su nota del día');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select is((select count(*)::int from public.shopping_lists) + (select count(*)::int from public.day_notes) + (select count(*)::int from public.meal_plans), 0, 'Otro cliente no ve nada de eso');

select * from finish();
rollback;
