-- =============================================================================
-- Contactos (seguimiento): gente con la que Jaime habla y que aún no es cliente,
-- o que nunca lo será. Llamadas de onboarding, asesorías gratis, colaboraciones…
-- Solo los ve el equipo. Si alguien acaba siendo cliente, desde aquí se crea su
-- ficha con lo que ya se apuntó en la llamada (y el contacto queda enlazado).
-- =============================================================================

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  email text check (email is null or length(email) <= 200),
  phone text check (phone is null or length(phone) <= 40),
  kind text not null default 'onboarding_call'
    check (kind in ('onboarding_call', 'free_consult', 'collaboration', 'other')),
  status text not null default 'pending'
    check (status in ('pending', 'scheduled', 'done', 'thinking', 'client', 'not_now', 'lost')),
  source text check (source is null or length(source) <= 80),
  company text check (company is null or length(company) <= 120),
  call_at timestamptz,
  next_followup_on date,
  age smallint check (age is null or age between 5 and 100),
  experience text check (experience is null or experience in ('none', 'beginner', 'intermediate', 'advanced')),
  goal text check (goal is null or length(goal) <= 1000),
  injuries text check (injuries is null or length(injuries) <= 1000),
  available_days smallint[] not null default '{}' check (available_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  availability_notes text check (availability_notes is null or length(availability_notes) <= 500),
  equipment text check (equipment is null or equipment in ('gym', 'home', 'both')),
  equipment_notes text check (equipment_notes is null or length(equipment_notes) <= 500),
  allergy_notes text check (allergy_notes is null or length(allergy_notes) <= 1000),
  plan_interest text check (plan_interest is null or length(plan_interest) <= 40),
  notes text check (notes is null or length(notes) <= 20000),
  lost_reason text check (lost_reason is null or length(lost_reason) <= 500),
  client_id uuid references public.clients (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contacts_status_idx on public.contacts (status, updated_at desc);
create index contacts_followup_idx on public.contacts (next_followup_on) where next_followup_on is not null;
create index contacts_client_idx on public.contacts (client_id) where client_id is not null;
create trigger contacts_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();

-- Comentarios con fecha: el historial de lo que Jaime va apuntando
create table public.contact_comments (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index contact_comments_contact_idx on public.contact_comments (contact_id, created_at desc);

alter table public.contacts enable row level security;
alter table public.contact_comments enable row level security;
grant select, insert, update, delete on public.contacts to authenticated;
grant select, insert, delete on public.contact_comments to authenticated;

create policy contacts_staff on public.contacts for all to authenticated
  using ((select public.has_scope('clients')))
  with check ((select public.has_scope('clients')));
create policy contact_comments_staff_read on public.contact_comments for select to authenticated
  using ((select public.has_scope('clients')));
create policy contact_comments_staff_insert on public.contact_comments for insert to authenticated
  with check ((select public.has_scope('clients')) and author_id = (select auth.uid()));
create policy contact_comments_own_delete on public.contact_comments for delete to authenticated
  using ((select public.has_scope('clients')) and author_id = (select auth.uid()));
