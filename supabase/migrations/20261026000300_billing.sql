-- =============================================================================
-- TWJ · 0300 · Planes, funciones por plan, suscripciones, pagos, descuentos,
--              squads, referidos, créditos de sesiones, leads (Peak) y Stripe
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Planes y precios
-- -----------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_]+$'),
  name text not null,
  tagline text,
  description text,
  highlights text[] not null default '{}',
  -- Precio mensual de lista (IVA incluido). null = a medida (Peak): nunca se muestra.
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency text not null default 'eur',
  annual_allowed boolean not null default true,
  requires_application boolean not null default false,
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  is_public boolean not null default true,
  badge text,
  stripe_product_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();
create trigger plans_audit after insert or update or delete on public.plans
  for each row execute function public.audit_row();

alter table public.clients
  add constraint clients_plan_fk foreign key (plan_id) references public.plans (id);

-- Histórico de precios (los Price de Stripe son inmutables; los clientes
-- existentes mantienen su precio: grandfathering).
create table public.plan_prices (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  interval text not null check (interval in ('month', 'year')),
  amount_cents integer not null check (amount_cents >= 0),
  stripe_price_id text unique,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now()
);
create index plan_prices_current_idx on public.plan_prices (plan_id, interval) where valid_to is null;

-- -----------------------------------------------------------------------------
-- Funciones y matriz por plan
-- -----------------------------------------------------------------------------
create table public.features (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  name text not null,
  description text,
  kind text not null default 'bool' check (kind in ('bool', 'limit')),
  unit text,
  sort_order smallint not null default 0
);

create table public.plan_features (
  plan_id uuid not null references public.plans (id) on delete cascade,
  feature_key text not null references public.features (key) on delete cascade,
  enabled boolean not null default true,
  limit_value integer, -- null = ilimitado (si kind = limit)
  label text,          -- texto a mostrar en la comparativa ("cada 15 días", "1 al mes"…)
  primary key (plan_id, feature_key)
);
create trigger plan_features_audit after insert or update or delete on public.plan_features
  for each row execute function public.audit_row();

create table public.client_feature_overrides (
  client_id uuid not null references public.clients (id) on delete cascade,
  feature_key text not null references public.features (key) on delete cascade,
  enabled boolean not null,
  limit_value integer,
  reason text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  primary key (client_id, feature_key)
);

-- -----------------------------------------------------------------------------
-- Suscripciones y pagos (Stripe y manual en las mismas tablas)
-- -----------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  plan_id uuid not null references public.plans (id),
  billing_mode text not null check (billing_mode in ('stripe', 'manual')),
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'past_due', 'paused', 'cancelled')),
  list_price_cents integer not null check (list_price_cents >= 0),   -- precio de lista por periodo
  amount_cents integer not null check (amount_cents >= 0),           -- importe final por periodo
  discount_breakdown jsonb not null default '[]'::jsonb,             -- [{kind, label, percent|amount_cents}]
  anchor_day smallint check (anchor_day between 1 and 31),            -- día de renovación (manual)
  current_period_start date,
  current_period_end date,   -- primer día NO cubierto (renovación)
  grace_until date,
  cancel_at_period_end boolean not null default false,
  paused_until date,
  stripe_subscription_id text unique,
  stripe_price_id text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_client_idx on public.subscriptions (client_id, created_at desc);
create index subscriptions_renewal_idx on public.subscriptions (current_period_end) where status in ('active', 'past_due');
-- Una sola suscripción "viva" por cliente
create unique index subscriptions_one_live_idx on public.subscriptions (client_id)
  where status in ('pending_payment', 'active', 'past_due', 'paused');
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
create trigger subscriptions_audit after insert or update or delete on public.subscriptions
  for each row execute function public.audit_row();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  kind text not null default 'subscription' check (kind in ('subscription', 'extra_session', 'peak', 'other')),
  method text not null check (method in ('stripe', 'bizum', 'transfer', 'cash', 'other')),
  status text not null default 'paid' check (status in ('pending', 'paid', 'failed', 'refunded')),
  amount_cents integer not null check (amount_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  currency text not null default 'eur',
  paid_at timestamptz,
  period_start date,
  period_end date,
  description text,
  stripe_invoice_id text unique,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text unique,
  recorded_by uuid references public.profiles (id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end is null or period_start is null or period_end > period_start)
);
create index payments_client_idx on public.payments (client_id, paid_at desc);
create index payments_paid_at_idx on public.payments (paid_at) where status = 'paid';
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger payments_audit after insert or update or delete on public.payments
  for each row execute function public.audit_row();

-- Archivo de facturas emitidas fuera de la app (no hay facturación electrónica).
create table public.invoices_manual (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  payment_id uuid references public.payments (id) on delete set null,
  number text not null unique,
  issued_on date not null,
  file_path text,
  notes text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Descuentos
-- -----------------------------------------------------------------------------
create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  code extensions.citext unique,           -- null = no se canjea con código (automático o por proceso)
  name text not null,
  kind text not null check (kind in ('founder', 'student', 'squad', 'annual', 'custom')),
  type text not null check (type in ('percent', 'fixed', 'tiered_percent')),
  value numeric(10, 2),                    -- % o céntimos/mes según type
  tiers jsonb,                             -- squad: [{"min_friends":2,"percent":15},{"min_friends":3,"percent":25}]
  duration text not null default 'forever' check (duration in ('once', 'repeating', 'forever')),
  duration_months smallint,
  applies_to_plan_keys text[],             -- null = todos
  applies_to_intervals text[],             -- null = mensual y anual
  max_redemptions integer,
  max_per_client integer not null default 1,
  starts_at timestamptz,
  expires_at timestamptz,
  requires_verification boolean not null default false,
  auto_apply boolean not null default false,
  stackable boolean not null default true,
  revoke_on_cancel boolean not null default false,
  is_active boolean not null default true,
  stripe_coupon_id text,
  stripe_promotion_code_id text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type <> 'tiered_percent' or tiers is not null),
  check (type = 'tiered_percent' or value is not null),
  check (type <> 'percent' or (value > 0 and value <= 100)),
  check (duration <> 'repeating' or duration_months > 0)
);
create trigger discounts_updated_at before update on public.discounts
  for each row execute function public.set_updated_at();
create trigger discounts_audit after insert or update or delete on public.discounts
  for each row execute function public.audit_row();

create table public.discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  status text not null default 'reserved' check (status in ('reserved', 'applied', 'expired', 'revoked')),
  reserved_until timestamptz,
  applied_at timestamptz,
  revoked_at timestamptz,
  ends_on date,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index discount_redemptions_discount_idx on public.discount_redemptions (discount_id, status);
create index discount_redemptions_client_idx on public.discount_redemptions (client_id);
create trigger discount_redemptions_audit after insert or update on public.discount_redemptions
  for each row execute function public.audit_row();

create table public.student_verifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  card_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  rejection_reason text,
  valid_until date,
  created_at timestamptz not null default now()
);
create index student_verifications_client_idx on public.student_verifications (client_id, created_at desc);
create index student_verifications_pending_idx on public.student_verifications (created_at) where status = 'pending';

-- -----------------------------------------------------------------------------
-- Squads (alta conjunta) y referidos
-- -----------------------------------------------------------------------------
create table public.squads (
  id uuid primary key default gen_random_uuid(),
  code extensions.citext not null unique,
  owner_client_id uuid references public.clients (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.squad_members (
  squad_id uuid not null references public.squads (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (squad_id, client_id)
);
-- Un cliente solo puede estar activo en un squad
create unique index squad_members_one_active_idx on public.squad_members (client_id) where left_at is null;

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_client_id uuid not null references public.clients (id) on delete cascade,
  referred_client_id uuid not null unique references public.clients (id) on delete cascade,
  code_used text not null,
  squad_id uuid references public.squads (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'qualified', 'rewarded', 'void')),
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  check (referrer_client_id <> referred_client_id)
);
create index referrals_referrer_idx on public.referrals (referrer_client_id);

-- -----------------------------------------------------------------------------
-- Créditos de sesiones (libro de movimientos; saldo = suma)
-- -----------------------------------------------------------------------------
create table public.session_credits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  credit_type text not null check (credit_type in ('live_training', 'monthly_call', 'extra')),
  delta smallint not null check (delta <> 0),
  reason text not null check (reason in ('monthly_grant', 'purchase', 'manual', 'consume', 'refund', 'expire')),
  period_start date,
  expires_at timestamptz,
  appointment_id uuid,  -- FK cuando exista appointments (Fase 5)
  payment_id uuid references public.payments (id) on delete set null,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index session_credits_client_idx on public.session_credits (client_id, credit_type);
-- Evita conceder dos veces los créditos del mismo periodo
create unique index session_credits_grant_once_idx on public.session_credits (client_id, credit_type, period_start)
  where reason = 'monthly_grant';

-- -----------------------------------------------------------------------------
-- Leads (solicitudes Peak / contacto) y eventos de Stripe (idempotencia)
-- -----------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'peak_application' check (kind in ('peak_application', 'contact')),
  name text not null check (length(name) between 1 and 120),
  email extensions.citext not null,
  phone text,
  message text check (length(message) <= 4000),
  pack_weeks smallint check (pack_weeks in (8, 10, 12)),
  event_name text,
  event_date date,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'won', 'lost')),
  quoted_price_cents integer check (quoted_price_cents >= 0),
  client_id uuid references public.clients (id) on delete set null,
  assigned_to uuid references public.profiles (id),
  consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_status_idx on public.leads (status, created_at desc);
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

create table public.stripe_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

-- -----------------------------------------------------------------------------
-- Funciones de negocio
-- -----------------------------------------------------------------------------
create or replace function public.today_madrid()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Madrid')::date;
$$;

-- ¿Puede el cliente usar la app? active, o past_due dentro de la gracia.
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

-- Función habilitada para el cliente (override > plan). Devuelve null si no aplica.
create or replace function public.feature_for_client(p_client_id uuid, p_feature text)
returns table (enabled boolean, limit_value integer)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(o.enabled, pf.enabled, false), coalesce(o.limit_value, pf.limit_value)
  from public.clients c
  left join public.plan_features pf on pf.plan_id = c.plan_id and pf.feature_key = p_feature
  left join public.client_feature_overrides o on o.client_id = c.id and o.feature_key = p_feature
  where c.id = p_client_id
    and (p_client_id = public.my_client_id() or public.is_staff() or auth.uid() is null);
$$;

create or replace function public.has_feature(p_client_id uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select f.enabled from public.feature_for_client(p_client_id, p_feature) f), false);
$$;

-- Plazas fundador restantes (aplicadas + reservas vigentes cuentan).
create or replace function public.founder_slots_left()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    coalesce(d.max_redemptions, 0) - (
      select count(*)::int from public.discount_redemptions r
      where r.discount_id = d.id
        and (r.status = 'applied' or (r.status = 'reserved' and r.reserved_until > now()))
    ),
    0
  )
  from public.discounts d
  where d.kind = 'founder' and d.is_active
  order by d.created_at
  limit 1;
$$;

-- Saldo de créditos por tipo (sin caducados)
create or replace function public.client_credit_balance(p_client_id uuid, p_type text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(delta), 0)::int
  from public.session_credits
  where client_id = p_client_id
    and (p_client_id = public.my_client_id() or public.is_staff() or auth.uid() is null)
    and credit_type = p_type
    and (expires_at is null or expires_at > now() or delta < 0);
$$;

-- Miembros activos del squad del cliente (sin exponer quiénes son)
create or replace function public.my_squad_size()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.squad_members m
  where m.left_at is null
    and m.squad_id = (
      select sm.squad_id from public.squad_members sm
      where sm.client_id = public.my_client_id() and sm.left_at is null
    );
$$;

-- -----------------------------------------------------------------------------
-- RLS y privilegios
-- -----------------------------------------------------------------------------
alter table public.plans enable row level security;
alter table public.plan_prices enable row level security;
alter table public.features enable row level security;
alter table public.plan_features enable row level security;
alter table public.client_feature_overrides enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.invoices_manual enable row level security;
alter table public.discounts enable row level security;
alter table public.discount_redemptions enable row level security;
alter table public.student_verifications enable row level security;
alter table public.squads enable row level security;
alter table public.squad_members enable row level security;
alter table public.referrals enable row level security;
alter table public.session_credits enable row level security;
alter table public.leads enable row level security;
alter table public.stripe_events enable row level security;

-- Catálogo de planes y funciones: público (para /empezar). Peak se muestra sin precio:
-- la columna price_cents de planes que requieren solicitud se oculta en la vista pública.
grant select on public.plans, public.plan_prices, public.features, public.plan_features to authenticated;
grant insert, update, delete on public.plans, public.plan_prices, public.features, public.plan_features to authenticated;
create policy plans_select on public.plans for select to authenticated
  using ((is_active and is_public) or (select public.is_staff()) or id = (select c.plan_id from public.clients c where c.profile_id = (select auth.uid())));
create policy plans_write on public.plans for all to authenticated
  using ((select public.has_scope('billing'))) with check ((select public.has_scope('billing')));
create policy plan_prices_select on public.plan_prices for select to authenticated
  using ((select public.is_staff()));
create policy plan_prices_write on public.plan_prices for all to authenticated
  using ((select public.has_scope('billing'))) with check ((select public.has_scope('billing')));
create policy features_select on public.features for select to authenticated using (true);
create policy features_write on public.features for all to authenticated
  using ((select public.has_scope('billing'))) with check ((select public.has_scope('billing')));
create policy plan_features_select on public.plan_features for select to authenticated using (true);
create policy plan_features_write on public.plan_features for all to authenticated
  using ((select public.has_scope('billing'))) with check ((select public.has_scope('billing')));

-- Vista pública para anónimos: nunca expone el precio de planes a medida (Peak).
create view public.public_plans
with (security_invoker = false) as
select p.id, p.key, p.name, p.tagline, p.description, p.highlights,
       case when p.requires_application then null else p.price_cents end as price_cents,
       p.currency, p.annual_allowed, p.requires_application, p.sort_order, p.badge
from public.plans p
where p.is_active and p.is_public;
create view public.public_plan_features
with (security_invoker = false) as
select pf.plan_id, pf.feature_key, f.name as feature_name, f.description as feature_description,
       f.kind, pf.enabled, pf.limit_value, pf.label, f.sort_order
from public.plan_features pf
join public.features f on f.key = pf.feature_key
join public.plans p on p.id = pf.plan_id and p.is_active and p.is_public;
grant select on public.public_plans, public.public_plan_features to anon, authenticated;

create policy client_feature_overrides_select on public.client_feature_overrides for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
grant select, insert, update, delete on public.client_feature_overrides to authenticated;
create policy client_feature_overrides_write on public.client_feature_overrides for all to authenticated
  using ((select public.has_scope('billing'))) with check ((select public.has_scope('billing')));

-- Suscripciones, pagos, facturas: el cliente lee lo suyo; staff con billing gestiona.
grant select, insert, update, delete on public.subscriptions, public.payments, public.invoices_manual to authenticated;
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.has_scope('billing')));
create policy subscriptions_write on public.subscriptions for all to authenticated
  using ((select public.has_scope('billing'))) with check ((select public.has_scope('billing')));
create policy payments_select on public.payments for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.has_scope('billing')));
create policy payments_write on public.payments for all to authenticated
  using ((select public.has_scope('billing'))) with check ((select public.has_scope('billing')));
create policy invoices_select on public.invoices_manual for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.has_scope('billing')));
create policy invoices_write on public.invoices_manual for all to authenticated
  using ((select public.has_scope('billing'))) with check ((select public.has_scope('billing')));

-- Descuentos: solo staff (la validación de códigos la hace el servidor).
grant select, insert, update, delete on public.discounts to authenticated;
create policy discounts_staff on public.discounts for all to authenticated
  using ((select public.has_scope('billing'))) with check ((select public.has_scope('billing')));

grant select, insert, update on public.discount_redemptions to authenticated;
create policy discount_redemptions_select on public.discount_redemptions for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.has_scope('billing')));
create policy discount_redemptions_write on public.discount_redemptions for all to authenticated
  using ((select public.has_scope('billing'))) with check ((select public.has_scope('billing')));

grant select, insert, update on public.student_verifications to authenticated;
create policy student_verifications_select on public.student_verifications for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.has_scope('billing')));
create policy student_verifications_insert on public.student_verifications for insert to authenticated
  with check (client_id = (select public.my_client_id()) and status = 'pending' and reviewed_by is null);
create policy student_verifications_review on public.student_verifications for update to authenticated
  using ((select public.has_scope('billing'))) with check ((select public.has_scope('billing')));

-- Squads: cada cliente ve solo su propia fila de miembro (nunca a los demás).
grant select, insert, update, delete on public.squads, public.squad_members, public.referrals to authenticated;
create policy squads_select on public.squads for select to authenticated
  using ((select public.is_staff()) or exists (
    select 1 from public.squad_members m
    where m.squad_id = squads.id and m.client_id = (select public.my_client_id())
  ));
create policy squads_write on public.squads for all to authenticated
  using ((select public.has_scope('billing'))) with check ((select public.has_scope('billing')));
create policy squad_members_select on public.squad_members for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy squad_members_write on public.squad_members for all to authenticated
  using ((select public.has_scope('billing'))) with check ((select public.has_scope('billing')));
create policy referrals_select on public.referrals for select to authenticated
  using (referrer_client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy referrals_write on public.referrals for all to authenticated
  using ((select public.has_scope('billing'))) with check ((select public.has_scope('billing')));

grant select, insert, update, delete on public.session_credits to authenticated;
create policy session_credits_select on public.session_credits for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy session_credits_write on public.session_credits for all to authenticated
  using ((select public.has_scope('billing'))) with check ((select public.has_scope('billing')));

-- Leads: inserción pública acotada (Peak); lectura y gestión solo staff.
grant insert on public.leads to anon, authenticated;
grant select, update, delete on public.leads to authenticated;
create policy leads_insert_public on public.leads for insert to anon, authenticated
  with check (status = 'new' and quoted_price_cents is null and client_id is null and assigned_to is null);
create policy leads_staff on public.leads for select to authenticated using ((select public.is_staff()));
create policy leads_staff_update on public.leads for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy leads_staff_delete on public.leads for delete to authenticated using ((select public.is_staff()));

-- stripe_events: sin acceso para anon/authenticated (solo service_role).

grant execute on function public.today_madrid() to anon, authenticated;
grant execute on function public.client_has_access(uuid) to authenticated;
grant execute on function public.feature_for_client(uuid, text) to authenticated;
grant execute on function public.has_feature(uuid, text) to authenticated;
grant execute on function public.founder_slots_left() to anon, authenticated;
grant execute on function public.client_credit_balance(uuid, text) to authenticated;
grant execute on function public.my_squad_size() to authenticated;
