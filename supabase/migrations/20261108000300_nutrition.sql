-- =============================================================================
-- TWJ · Fase 4 · Nutrición: base de alimentos (Mercadona/Hacendado + Open Food
-- Facts), plantillas, menú semanal por cliente (días → comidas → alimentos),
-- solicitudes de cambio, notas por día, lista de la compra y afiliados HSN.
-- Valores nutricionales: nunca inventados. Lo importado entra como "sin verificar".
-- =============================================================================

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 160),
  brand text,
  category text,
  supermarket_section text not null default 'Otros',
  -- Por 100 g (o 100 ml). Null = dato desconocido (no se inventa).
  kcal numeric(7, 2) check (kcal >= 0),
  protein_g numeric(6, 2) check (protein_g >= 0),
  carbs_g numeric(6, 2) check (carbs_g >= 0),
  fat_g numeric(6, 2) check (fat_g >= 0),
  fiber_g numeric(6, 2) check (fiber_g >= 0),
  sugar_g numeric(6, 2) check (sugar_g >= 0),
  salt_g numeric(6, 2) check (salt_g >= 0),
  unit_name text,                          -- "huevo", "rebanada", "yogur"…
  unit_grams numeric(7, 2) check (unit_grams > 0),
  pack_size_g numeric(8, 2) check (pack_size_g > 0),
  price_cents integer check (price_cents >= 0), -- precio orientativo del envase
  allergens text[] not null default '{}',
  source text not null default 'manual' check (source in ('manual', 'off', 'csv')),
  off_barcode text unique,
  verified boolean not null default false,
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index foods_name_idx on public.foods (lower(name));
create trigger foods_updated_at before update on public.foods
  for each row execute function public.set_updated_at();

create table public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  kcal_target integer,
  tags text[] not null default '{}',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  template_id uuid references public.meal_templates (id) on delete cascade,
  week_start date, -- lunes de la semana (solo menús de cliente)
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((client_id is null) <> (template_id is null))
);
create unique index meal_plans_client_week_idx on public.meal_plans (client_id, week_start) where client_id is not null;
create trigger meal_plans_updated_at before update on public.meal_plans
  for each row execute function public.set_updated_at();

create table public.meal_plan_days (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  day_index smallint not null check (day_index between 0 and 6), -- 0 = lunes
  notes text,
  unique (meal_plan_id, day_index)
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.meal_plan_days (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  slot text not null check (slot in ('breakfast', 'lunch', 'snack', 'dinner', 'extra')),
  title text,
  sort_order smallint not null default 0,
  notes text
);
create index meals_day_idx on public.meals (day_id);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete restrict,
  quantity_g numeric(8, 2) check (quantity_g > 0),
  quantity_units numeric(6, 2) check (quantity_units > 0),
  notes text,
  sort_order smallint not null default 0,
  check (quantity_g is not null or quantity_units is not null)
);
create index meal_items_meal_idx on public.meal_items (meal_id);

create table public.meal_change_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  meal_plan_id uuid references public.meal_plans (id) on delete cascade,
  meal_id uuid references public.meals (id) on delete set null,
  day_index smallint check (day_index between 0 and 6),
  reason text not null check (length(reason) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'rejected')),
  response text,
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index meal_change_requests_open_idx on public.meal_change_requests (status, created_at) where status = 'open';

create table public.day_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null,
  author_id uuid not null references public.profiles (id),
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index day_notes_client_date_idx on public.day_notes (client_id, date);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  meal_plan_id uuid not null unique references public.meal_plans (id) on delete cascade,
  persons smallint not null default 1 check (persons between 1 and 10),
  generated_at timestamptz not null default now()
);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  name text not null,
  section text not null,
  quantity_g numeric(10, 2),
  units numeric(8, 2),
  packs integer,
  estimated_cents integer,
  checked boolean not null default false
);
create index shopping_list_items_list_idx on public.shopping_list_items (list_id);

create table public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text,
  url text not null check (url ~ '^https://'),
  code text,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table public.affiliate_clicks (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.affiliate_links (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  clicked_at timestamptz not null default now()
);
create index affiliate_clicks_link_idx on public.affiliate_clicks (link_id, clicked_at);

-- Copia profunda de un menú (asignar plantilla, guardar como plantilla, repetir semana)
create or replace function public.copy_meal_plan(p_plan uuid, p_client uuid, p_template uuid, p_week_start date)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_new uuid;
  d record;
  m record;
  v_day uuid;
  v_meal uuid;
begin
  if (p_client is null) = (p_template is null) then
    raise exception 'Indica cliente o plantilla de destino';
  end if;
  insert into public.meal_plans (client_id, template_id, week_start, status, notes)
  select p_client, p_template, case when p_client is null then null else p_week_start end, 'draft', notes
  from public.meal_plans where id = p_plan
  returning id into v_new;
  if v_new is null then
    raise exception 'Menú no encontrado';
  end if;
  for d in select * from public.meal_plan_days where meal_plan_id = p_plan loop
    insert into public.meal_plan_days (meal_plan_id, client_id, day_index, notes)
    values (v_new, p_client, d.day_index, d.notes) returning id into v_day;
    for m in select * from public.meals where day_id = d.id loop
      insert into public.meals (day_id, client_id, slot, title, sort_order, notes)
      values (v_day, p_client, m.slot, m.title, m.sort_order, m.notes) returning id into v_meal;
      insert into public.meal_items (meal_id, client_id, food_id, quantity_g, quantity_units, notes, sort_order)
      select v_meal, p_client, i.food_id, i.quantity_g, i.quantity_units, i.notes, i.sort_order
      from public.meal_items i where i.meal_id = m.id;
    end loop;
  end loop;
  return v_new;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.foods enable row level security;
alter table public.meal_templates enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_days enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.meal_change_requests enable row level security;
alter table public.day_notes enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.affiliate_links enable row level security;
alter table public.affiliate_clicks enable row level security;

grant select, insert, update, delete on public.foods, public.meal_templates, public.affiliate_links to authenticated;
create policy foods_read on public.foods for select to authenticated using (is_active or (select public.is_staff()));
create policy foods_write on public.foods for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy meal_templates_staff on public.meal_templates for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy affiliate_links_read on public.affiliate_links for select to authenticated using (is_active or (select public.is_staff()));
create policy affiliate_links_write on public.affiliate_links for all to authenticated
  using ((select public.has_scope('settings'))) with check ((select public.has_scope('settings')));

-- Menú: el cliente ve los publicados (y su contenido); staff todo.
grant select, insert, update, delete on public.meal_plans, public.meal_plan_days, public.meals, public.meal_items to authenticated;
create policy meal_plans_read on public.meal_plans for select to authenticated
  using ((client_id = (select public.my_client_id()) and status = 'published') or (select public.is_staff()));
-- El contenido hereda la visibilidad del menú: un borrador no se filtra por días/comidas.
create policy meal_plan_days_read on public.meal_plan_days for select to authenticated
  using ((select public.is_staff()) or (client_id = (select public.my_client_id()) and exists (
    select 1 from public.meal_plans p where p.id = meal_plan_id and p.status = 'published')));
create policy meals_read on public.meals for select to authenticated
  using ((select public.is_staff()) or (client_id = (select public.my_client_id()) and exists (
    select 1 from public.meal_plan_days d join public.meal_plans p on p.id = d.meal_plan_id
    where d.id = day_id and p.status = 'published')));
create policy meal_items_read on public.meal_items for select to authenticated
  using ((select public.is_staff()) or (client_id = (select public.my_client_id()) and exists (
    select 1 from public.meals m join public.meal_plan_days d on d.id = m.day_id join public.meal_plans p on p.id = d.meal_plan_id
    where m.id = meal_id and p.status = 'published')));
create policy meal_plans_write on public.meal_plans for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy meal_plan_days_write on public.meal_plan_days for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy meals_write on public.meals for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));
create policy meal_items_write on public.meal_items for all to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));

grant select, insert, update on public.meal_change_requests to authenticated;
create policy meal_change_requests_read on public.meal_change_requests for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy meal_change_requests_own on public.meal_change_requests for insert to authenticated
  with check (client_id = (select public.my_client_id()) and status = 'open' and public.client_has_access(client_id));
create policy meal_change_requests_staff on public.meal_change_requests for update to authenticated
  using ((select public.has_scope('clients'))) with check ((select public.has_scope('clients')));

-- Notas por día: el cliente y el equipo escriben; cada uno borra las suyas.
grant select, insert, delete on public.day_notes to authenticated;
create policy day_notes_read on public.day_notes for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy day_notes_insert on public.day_notes for insert to authenticated
  with check (author_id = (select auth.uid()) and (client_id = (select public.my_client_id()) or (select public.is_staff())));
create policy day_notes_delete on public.day_notes for delete to authenticated
  using (author_id = (select auth.uid()));

-- Lista de la compra: del cliente (la genera y marca lo comprado); staff lee.
grant select, insert, update, delete on public.shopping_lists, public.shopping_list_items to authenticated;
create policy shopping_lists_read on public.shopping_lists for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy shopping_lists_own on public.shopping_lists for all to authenticated
  using (client_id = (select public.my_client_id())) with check (client_id = (select public.my_client_id()));
create policy shopping_list_items_read on public.shopping_list_items for select to authenticated
  using (client_id = (select public.my_client_id()) or (select public.is_staff()));
create policy shopping_list_items_own on public.shopping_list_items for all to authenticated
  using (client_id = (select public.my_client_id())) with check (client_id = (select public.my_client_id()));

-- Clics de afiliado: solo staff los ve (se registran desde el servidor)
grant select on public.affiliate_clicks to authenticated;
create policy affiliate_clicks_staff on public.affiliate_clicks for select to authenticated using ((select public.is_staff()));

grant execute on function public.copy_meal_plan(uuid, uuid, uuid, date) to authenticated;

-- -----------------------------------------------------------------------------
-- Datos de referencia: enlaces HSN. TODO(Jaime): código de afiliado y enlaces reales.
-- -----------------------------------------------------------------------------
insert into public.affiliate_links (label, description, url, code, sort_order, is_active) values
  ('Creatina monohidrato', 'El suplemento con más evidencia para fuerza y potencia. 3–5 g al día, sin cargas.', 'https://www.hsnstore.com/', null, 1, false),
  ('Proteína en polvo', 'Solo si con la comida no llegas a tu proteína diaria. No hace magia: es comida en polvo.', 'https://www.hsnstore.com/', null, 2, false);

insert into public.settings (key, value, is_public, description) values
  ('nutrition.affiliate_disclaimer', '"Enlace de afiliado: si compras desde aquí, TWJ recibe una pequeña comisión y a ti no te cuesta más. Solo recomendamos lo que tiene sentido."', true, 'Aviso visible en los enlaces de afiliado')
on conflict (key) do nothing;

insert into public.message_templates (key, channel, subject, body, variables, description) values
  ('menu_published', 'email', 'Tienes menú nuevo', 'Hola {{nombre}}: Jaime ha publicado tu menú de la semana. Lista de la compra incluida.\n\n{{enlace}}', array['nombre', 'enlace'], 'Aviso de menú nuevo')
on conflict (key) do nothing;
