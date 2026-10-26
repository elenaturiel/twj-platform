-- =============================================================================
-- TWJ · 0500 · Storage: buckets privados por cliente.
-- Convención de rutas: {client_id}/{...}. Las URLs firmadas se generan en el
-- servidor (cortas) y los accesos de staff se registran en audit_log.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 2 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']),
  ('student-cards', 'student-cards', false, 8 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']),
  ('documents', 'documents', false, 20 * 1024 * 1024, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Primer segmento de la ruta = client_id (o profile_id en avatars)
create or replace function public.storage_owner_segment(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select split_part(p_name, '/', 1);
$$;
grant execute on function public.storage_owner_segment(text) to authenticated;

-- avatars: {profile_id}/avatar.ext — cada uno el suyo; staff lee todos.
create policy avatars_rw_own on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and public.storage_owner_segment(name) = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and public.storage_owner_segment(name) = (select auth.uid())::text);
create policy avatars_staff_read on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (select public.is_staff()));

-- student-cards: el cliente sube y ve el suyo; staff con billing revisa.
create policy student_cards_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'student-cards' and public.storage_owner_segment(name) = (select public.my_client_id())::text);
create policy student_cards_select on storage.objects for select to authenticated
  using (bucket_id = 'student-cards' and (
    public.storage_owner_segment(name) = (select public.my_client_id())::text
    or (select public.has_scope('billing'))
  ));

-- documents: los sube staff; el cliente lee los de su carpeta.
create policy documents_staff on storage.objects for all to authenticated
  using (bucket_id = 'documents' and (select public.has_scope('clients')))
  with check (bucket_id = 'documents' and (select public.has_scope('clients')));
create policy documents_client_read on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.storage_owner_segment(name) = (select public.my_client_id())::text);
