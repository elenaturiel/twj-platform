-- RGPD: la exportación solo trae lo mío; anonimizar borra lo personal y de
-- salud pero conserva los pagos; un cliente no puede anonimizar a nadie.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000b1', 'b1@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@test.local', 'authenticated', 'authenticated');
update public.profiles set full_name = 'Berta Privada' where id = '00000000-0000-0000-0000-0000000000b1';
insert into public.clients (id, profile_id, status, plan_id, onboarding_completed_at)
select v.id::uuid, v.p::uuid, 'active', (select id from public.plans where key = 'rookie'), now()
from (values ('27000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1'),
             ('27000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b2')) v(id, p);
insert into public.client_intake (client_id, goal) values ('27000000-0000-0000-0000-0000000000b1', 'Correr una maratón');
insert into public.client_intake (client_id, goal) values ('27000000-0000-0000-0000-0000000000b2', 'Secreto de otro');
insert into public.payments (client_id, method, amount_cents, paid_at) values ('27000000-0000-0000-0000-0000000000b1', 'cash', 5000, now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select is(public.export_my_data() -> 'client_intake' -> 0 ->> 'goal', 'Correr una maratón', 'La exportación incluye mis datos');
select ok(public.export_my_data()::text not like '%Secreto de otro%', 'La exportación no incluye datos de otros');
select throws_ok($$ select public.anonymize_client('27000000-0000-0000-0000-0000000000b2') $$, '42501', null, 'Un cliente no puede anonimizar');
select lives_ok($$ insert into public.data_requests (profile_id, kind) values ('00000000-0000-0000-0000-0000000000b1', 'delete') $$, 'Puede pedir que borren su cuenta');

reset role;
select lives_ok($$ select public.anonymize_client('27000000-0000-0000-0000-0000000000b1') $$, 'El servidor anonimiza');
select is((select count(*)::int from public.client_intake where client_id = '27000000-0000-0000-0000-0000000000b1'), 0, 'Se borran los datos de la ficha');
select is((select count(*)::int from public.payments where client_id = '27000000-0000-0000-0000-0000000000b1'), 1, 'Los pagos se conservan');
select is((select full_name from public.profiles where id = '00000000-0000-0000-0000-0000000000b1'), 'Cliente eliminado', 'El nombre desaparece');

select * from finish();
rollback;
