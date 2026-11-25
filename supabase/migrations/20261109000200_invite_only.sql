-- Alta solo con invitación: el público solicita plaza y el equipo acepta.
alter table public.leads drop constraint if exists leads_kind_check;
alter table public.leads add constraint leads_kind_check check (kind in ('peak_application', 'contact', 'access_request'));

insert into public.settings (key, value, is_public, description) values
  ('access.public_signup', 'false', true, 'false = solo entra quien acepte el equipo (el público solicita plaza); true = alta y pago abiertos en /empezar')
on conflict (key) do nothing;
