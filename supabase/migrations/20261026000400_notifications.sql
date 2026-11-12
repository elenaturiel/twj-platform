-- =============================================================================
-- TWJ · 0400 · Notificaciones (in-app + outbox para email/push), preferencias,
--              suscripciones push y plantillas de mensajes editables
-- =============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  client_id uuid references public.clients (id) on delete cascade, -- cliente al que se refiere (avisos a staff)
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_profile_idx on public.notifications (profile_id, created_at desc);
create index notifications_unread_idx on public.notifications (profile_id) where read_at is null;

create table public.notification_preferences (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,      -- '*' = todas
  channel text not null check (channel in ('email', 'push')),
  enabled boolean not null default true,
  digest boolean not null default false, -- agrupar en el resumen diario
  primary key (profile_id, type, channel)
);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null check (channel in ('email', 'push')),
  template_key text,
  payload jsonb not null default '{}'::jsonb,
  digest boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts smallint not null default 0,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create index notification_outbox_pending_idx on public.notification_outbox (scheduled_for) where status = 'pending';

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

-- Textos editables de emails y mensajes automáticos (variables {{nombre}}…)
create table public.message_templates (
  key text primary key,
  channel text not null check (channel in ('email', 'push', 'in_app')),
  subject text,
  body text not null,
  variables text[] not null default '{}',
  description text,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);
create trigger message_templates_updated_at before update on public.message_templates
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- notify(): crea la notificación in-app y encola email/push según preferencias.
-- Se usa desde triggers y desde el servidor (service_role).
-- -----------------------------------------------------------------------------
create or replace function public.notify(
  p_profile_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_link text default null,
  p_client_id uuid default null,
  p_data jsonb default '{}'::jsonb,
  p_template_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_channel text;
  v_enabled boolean;
  v_digest boolean;
begin
  insert into public.notifications (profile_id, type, title, body, link, client_id, data)
  values (p_profile_id, p_type, p_title, p_body, p_link, p_client_id, coalesce(p_data, '{}'::jsonb))
  returning id into v_id;

  foreach v_channel in array array['email', 'push'] loop
    select coalesce(specific.enabled, wildcard.enabled, true),
           coalesce(specific.digest, wildcard.digest, false)
      into v_enabled, v_digest
    from (select 1) dummy
    left join public.notification_preferences specific
      on specific.profile_id = p_profile_id and specific.type = p_type and specific.channel = v_channel
    left join public.notification_preferences wildcard
      on wildcard.profile_id = p_profile_id and wildcard.type = '*' and wildcard.channel = v_channel;

    -- Push solo si hay dispositivo suscrito
    if v_enabled and (v_channel = 'email' or exists (
      select 1 from public.push_subscriptions ps where ps.profile_id = p_profile_id
    )) then
      insert into public.notification_outbox (notification_id, profile_id, channel, template_key, payload, digest)
      values (
        v_id, p_profile_id, v_channel, coalesce(p_template_key, p_type),
        jsonb_build_object('title', p_title, 'body', p_body, 'link', p_link, 'data', p_data),
        v_digest
      );
    end if;
  end loop;

  return v_id;
end;
$$;

create or replace function public.notify_staff(
  p_type text,
  p_title text,
  p_body text default null,
  p_link text default null,
  p_client_id uuid default null,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid;
begin
  for v_staff in
    select p.id from public.profiles p
    where p.role in ('owner', 'admin') and p.deleted_at is null
  loop
    perform public.notify(v_staff, p_type, p_title, p_body, p_link, p_client_id, p_data);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.message_templates enable row level security;

grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_own on public.notifications for select to authenticated
  using (profile_id = (select auth.uid()));
create policy notifications_mark_read on public.notifications for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy notifications_delete_own on public.notifications for delete to authenticated
  using (profile_id = (select auth.uid()));

grant select, insert, update, delete on public.notification_preferences to authenticated;
create policy notification_preferences_own on public.notification_preferences for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- outbox: solo service_role (worker).

grant select, insert, delete on public.push_subscriptions to authenticated;
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

grant select, insert, update, delete on public.message_templates to authenticated;
create policy message_templates_staff on public.message_templates for all to authenticated
  using ((select public.has_scope('settings'))) with check ((select public.has_scope('settings')));

-- Realtime para el contador de avisos in-app
alter publication supabase_realtime add table public.notifications;
