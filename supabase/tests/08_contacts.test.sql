-- Contactos de seguimiento: solo el equipo los ve y los edita; un cliente no.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000c1', 'staff-c@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c2', 'cliente-c@test.local', 'authenticated', 'authenticated');
update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-0000000000c1';
insert into public.clients (id, profile_id, status, plan_id)
values ('28000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c2', 'active',
        (select id from public.plans where key = 'rookie'));
insert into public.contacts (id, full_name, kind, notes)
values ('29000000-0000-0000-0000-0000000000c1', 'Marta Posible', 'free_consult', 'Quiere empezar en enero');

-- El equipo
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is((select count(*)::int from public.contacts where id = '29000000-0000-0000-0000-0000000000c1'), 1, 'El equipo ve los contactos');
select lives_ok($$ insert into public.contact_comments (contact_id, author_id, body)
  values ('29000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'Le escribo el lunes') $$,
  'El equipo comenta');
select throws_ok($$ insert into public.contact_comments (contact_id, author_id, body)
  values ('29000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2', 'Suplantando') $$,
  '42501', null, 'No se puede comentar en nombre de otro');

-- Un cliente
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select is((select count(*)::int from public.contacts), 0, 'Un cliente no ve los contactos');
select is((select count(*)::int from public.contact_comments), 0, 'Un cliente no ve los comentarios');
select throws_ok($$ insert into public.contacts (full_name) values ('Intruso') $$, '42501', null,
  'Un cliente no puede crear contactos');

select * from finish();
rollback;
