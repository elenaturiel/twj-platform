-- Chat: cada cliente solo ve y escribe en su conversación; el equipo responde;
-- contador de no leídos y aviso al otro lado.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000f1', 'f1@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f2', 'f2@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000f9', 'f9@test.local', 'authenticated', 'authenticated');
update public.profiles set role = 'owner', full_name = 'Jaime Test' where id = '00000000-0000-0000-0000-0000000000f9';
update public.profiles set full_name = 'Cliente Uno' where id = '00000000-0000-0000-0000-0000000000f1';
insert into public.clients (id, profile_id, status, plan_id, onboarding_completed_at)
select v.id::uuid, v.p::uuid, 'active', (select id from public.plans where key = 'rookie'), now()
from (values ('23000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f1'),
             ('23000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f2')) v(id, p);
insert into public.conversations (id, client_id) values
  ('24000000-0000-0000-0000-0000000000f2', '23000000-0000-0000-0000-0000000000f2');

-- Línea base del equipo (la BD local puede tener chats de demo)
create temp table t_base (n int);
grant all on t_base to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f9","role":"authenticated"}';
insert into t_base select public.chat_unread_count();
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';

select lives_ok($$ select public.get_or_create_conversation('23000000-0000-0000-0000-0000000000f1') $$, 'El cliente abre su conversación');
select throws_ok($$ select public.get_or_create_conversation('23000000-0000-0000-0000-0000000000f2') $$, '42501', null, 'No abre la de otro');
select lives_ok($$ insert into public.messages (conversation_id, client_id, sender_id, body)
  select id, client_id, '00000000-0000-0000-0000-0000000000f1', '¿Puedo cambiar el lunes por el martes?'
  from public.conversations where client_id = '23000000-0000-0000-0000-0000000000f1' $$, 'Escribe en su conversación');
select throws_ok($$ insert into public.messages (conversation_id, client_id, sender_id, body)
  values ('24000000-0000-0000-0000-0000000000f2', '23000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f1', 'hola') $$,
  '42501', null, 'No escribe en la de otro');
select is((select count(*)::int from public.conversations), 1, 'Solo ve su conversación');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f9","role":"authenticated"}';
select is(public.chat_unread_count() - (select n from t_base), 1, 'El equipo ve 1 mensaje más sin leer');
select is((select count(*)::int from public.notifications where type = 'chat_message' and profile_id = '00000000-0000-0000-0000-0000000000f9'), 1,
  'Se avisa al equipo');
select lives_ok($$ insert into public.messages (conversation_id, client_id, sender_id, body)
  select id, client_id, '00000000-0000-0000-0000-0000000000f9', 'Sí, sin problema'
  from public.conversations where client_id = '23000000-0000-0000-0000-0000000000f1' $$, 'El equipo responde');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
select is(public.chat_unread_count(), 1, 'El cliente tiene la respuesta sin leer');

select * from finish();
rollback;
