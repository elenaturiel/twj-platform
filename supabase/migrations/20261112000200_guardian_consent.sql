-- =============================================================================
-- Menores: autorización firmada del padre, madre o tutor legal.
-- La app genera un PDF con los datos; el tutor lo firma y el menor lo sube (o se
-- lo manda a Jaime, que lo sube). Hasta que Jaime lo aprueba (guardian_status =
-- 'confirmed') el menor no tiene acceso a su plan, tampoco a nivel de datos.
-- =============================================================================

-- Fotos del móvil (iPhone) también
update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
where id = 'documents';

-- El cliente sube a su propia carpeta de documentos (solo la autorización del tutor)
create policy documents_client_upload on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.storage_owner_segment(name) = (select public.my_client_id())::text
    and name like '%/autorizacion-tutor-%'
  );

-- …y registra el documento (tipo «guardian», a su nombre)
create policy documents_client_guardian_insert on public.documents for insert to authenticated
  with check (
    client_id = (select public.my_client_id())
    and kind = 'guardian'
    and uploaded_by = (select auth.uid())
  );

-- Sin autorización del tutor no hay acceso al plan (entrenos, menús, reservas…)
create or replace function public.client_has_access(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clients c
    where c.id = p_client_id
      and (p_client_id = public.my_client_id() or public.is_staff() or auth.uid() is null)
      and c.guardian_status <> 'pending'
      and (
        c.status = 'active'
        or (c.status = 'past_due' and exists (
          select 1 from public.subscriptions s
          where s.client_id = c.id
            and s.status = 'past_due'
            and s.grace_until >= public.today_madrid()
        ))
      )
  );
$$;
