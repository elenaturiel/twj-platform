-- Menores: sin autorización del tutor no hay acceso al plan; el menor solo puede
-- subir su autorización a su carpeta.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000d1', 'menor@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d2', 'otro@test.local', 'authenticated', 'authenticated');
insert into public.clients (id, profile_id, status, plan_id, is_minor, guardian_status, onboarding_completed_at)
select v.id::uuid, v.p::uuid, 'active', (select id from public.plans where key = 'rookie'), v.minor, v.g, now()
from (values ('30000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d1', true, 'pending'),
             ('30000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d2', false, 'not_required')) v(id, p, minor, g);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select ok(not public.client_has_access('30000000-0000-0000-0000-0000000000d1'), 'Menor sin autorización: sin acceso');
select lives_ok($$ insert into public.documents (client_id, kind, title, storage_path, uploaded_by)
  values ('30000000-0000-0000-0000-0000000000d1', 'guardian', 'Autorización', '30000000-0000-0000-0000-0000000000d1/autorizacion-tutor-1.pdf', '00000000-0000-0000-0000-0000000000d1') $$,
  'El menor registra su autorización');
select throws_ok($$ insert into public.documents (client_id, kind, title, storage_path, uploaded_by)
  values ('30000000-0000-0000-0000-0000000000d1', 'invoice', 'Otra cosa', 'x/y.pdf', '00000000-0000-0000-0000-0000000000d1') $$,
  '42501', null, 'Solo puede subir la autorización del tutor');
select throws_ok($$ insert into public.documents (client_id, kind, title, storage_path, uploaded_by)
  values ('30000000-0000-0000-0000-0000000000d2', 'guardian', 'Ajena', 'x/y.pdf', '00000000-0000-0000-0000-0000000000d1') $$,
  '42501', null, 'No puede subir documentos a otro cliente');

reset role;
update public.clients set guardian_status = 'confirmed' where id = '30000000-0000-0000-0000-0000000000d1';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select ok(public.client_has_access('30000000-0000-0000-0000-0000000000d1'), 'Con la autorización aprobada: acceso');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select ok(public.client_has_access('30000000-0000-0000-0000-0000000000d2'), 'Un adulto no necesita autorización');

select * from finish();
rollback;
