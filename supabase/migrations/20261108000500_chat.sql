-- =============================================================================
-- Fase 6 · Chat cliente ↔ equipo (dudas puntuales): conversaciones, mensajes
-- con adjuntos (foto, vídeo, audio), estado de lectura y Realtime.
-- Las revisiones siguen por WhatsApp; esto es para dudas del día a día.
-- =============================================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients (id) on delete cascade,
  last_message_at timestamptz,
  last_message_preview text,
  last_sender_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index conversations_last_idx on public.conversations (last_message_at desc nulls last);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text check (length(body) <= 4000),
  attachment_path text,
  attachment_type text check (attachment_type in ('image', 'video', 'audio', 'file')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (nullif(trim(body), '') is not null or attachment_path is not null)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

create table public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

-- Conversación del cliente (la crea si no existe)
create or replace function public.get_or_create_conversation(p_client_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not (public.is_staff() or p_client_id = public.my_client_id()) then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;
  select id into v_id from public.conversations where client_id = p_client_id;
  if v_id is null then
    insert into public.conversations (client_id) values (p_client_id)
    on conflict (client_id) do update set client_id = excluded.client_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;

-- Marca como leído hasta ahora
create or replace function public.mark_conversation_read(p_conversation uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation and (public.is_staff() or c.client_id = public.my_client_id())
  ) then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;
  insert into public.conversation_reads (conversation_id, profile_id, last_read_at)
  values (p_conversation, auth.uid(), now())
  on conflict (conversation_id, profile_id) do update set last_read_at = excluded.last_read_at;
  -- Los avisos de chat de esa conversación quedan leídos
  update public.notifications n set read_at = now()
  where n.profile_id = auth.uid() and n.type = 'chat_message' and n.read_at is null
    and n.client_id = (select client_id from public.conversations where id = p_conversation);
end;
$$;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- Mensajes sin leer del usuario actual (cliente: los suyos; staff: de todos los clientes)
create or replace function public.chat_unread_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  left join public.conversation_reads r on r.conversation_id = c.id and r.profile_id = auth.uid()
  where m.deleted_at is null
    and m.sender_id <> auth.uid()
    and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
    and (
      (public.is_staff() and exists (select 1 from public.profiles p where p.id = m.sender_id and p.role = 'client'))
      or c.client_id = public.my_client_id()
    );
$$;
grant execute on function public.chat_unread_count() to authenticated;

-- Al llegar un mensaje: actualiza la conversación y avisa al otro lado
-- (como mucho un aviso cada 10 min por conversación y persona, para no saturar).
create or replace function public.on_message_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_role text;
  v_client_profile uuid;
  v_name text;
  v_preview text := coalesce(nullif(left(trim(new.body), 140), ''), case new.attachment_type
    when 'image' then '📷 Foto' when 'video' then '🎥 Vídeo' when 'audio' then '🎙️ Audio' else '📎 Archivo' end);
  s record;
begin
  update public.conversations
  set last_message_at = new.created_at, last_message_preview = v_preview, last_sender_id = new.sender_id
  where id = new.conversation_id;

  select role, full_name into v_sender_role, v_name from public.profiles where id = new.sender_id;
  select profile_id into v_client_profile from public.clients where id = new.client_id;

  if v_sender_role = 'client' then
    for s in select p.id from public.profiles p where p.role in ('owner', 'admin') and p.deleted_at is null loop
      if not exists (
        select 1 from public.notifications n
        where n.profile_id = s.id and n.type = 'chat_message' and n.client_id = new.client_id
          and n.read_at is null and n.created_at > now() - interval '10 minutes'
      ) then
        perform public.notify(s.id, 'chat_message', 'Mensaje de ' || coalesce(v_name, 'un cliente'), v_preview,
          '/panel/clientes/' || new.client_id || '/chat', new.client_id);
      end if;
    end loop;
  elsif v_client_profile is not null and not exists (
    select 1 from public.notifications n
    where n.profile_id = v_client_profile and n.type = 'chat_message'
      and n.read_at is null and n.created_at > now() - interval '10 minutes'
  ) then
    perform public.notify(v_client_profile, 'chat_message', coalesce(split_part(v_name, ' ', 1), 'Jaime') || ' te ha respondido',
      v_preview, '/chat', new.client_id);
  end if;
  return new;
end;
$$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message_inserted();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_reads enable row level security;

grant select on public.conversations to authenticated;
create policy conversations_read on public.conversations for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));

grant select, insert on public.messages to authenticated;
grant update (deleted_at) on public.messages to authenticated;
create policy messages_read on public.messages for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (select 1 from public.conversations c where c.id = conversation_id and c.client_id = messages.client_id)
    and (
      (select public.has_scope('clients'))
      or (client_id = (select public.my_client_id()) and public.client_has_access(client_id) and public.has_feature(client_id, 'chat'))
    )
  );
-- Borrar (ocultar) solo lo propio
create policy messages_delete_own on public.messages for update to authenticated
  using (sender_id = (select auth.uid())) with check (sender_id = (select auth.uid()));

grant select on public.conversation_reads to authenticated;
create policy conversation_reads_read on public.conversation_reads for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_staff()));

alter publication supabase_realtime add table public.messages;

-- -----------------------------------------------------------------------------
-- Adjuntos: chat/{client_id}/{uuid}.ext — cliente su carpeta, staff todo.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat', 'chat', false, 50 * 1024 * 1024, array[
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm',
  'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/aac', 'audio/x-m4a',
  'application/pdf'
])
on conflict (id) do nothing;

create policy chat_client_rw on storage.objects for all to authenticated
  using (bucket_id = 'chat' and public.storage_owner_segment(name) = (select public.my_client_id())::text)
  with check (bucket_id = 'chat' and public.storage_owner_segment(name) = (select public.my_client_id())::text);
create policy chat_staff_rw on storage.objects for all to authenticated
  using (bucket_id = 'chat' and (select public.has_scope('clients')))
  with check (bucket_id = 'chat' and (select public.has_scope('clients')));

-- Ajuste: texto que ve el cliente arriba del chat
insert into public.settings (key, value, is_public, description) values
  ('chat.intro', '"Para dudas puntuales. Jaime responde en horario de trabajo; si es urgente, WhatsApp."', true, 'Aviso que ve el cliente arriba del chat')
on conflict (key) do nothing;
