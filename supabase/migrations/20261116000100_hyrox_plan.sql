-- =============================================================================
-- Plan HYROX: preparación a medida. Sin precio publicado (cada cliente tiene su
-- importe pactado), sin pago anual y con solicitud previa: el interesado cuenta
-- su caso, Jaime le propone el plan y lo da de alta con el importe acordado.
-- Por defecto incluye lo mismo que Peak; Jaime lo ajusta para el plan (Planes y
-- descuentos) o para cada cliente (ficha → Resumen → Qué incluye su plan).
-- =============================================================================

insert into public.plans (key, name, tagline, description, price_cents, annual_allowed, requires_application, sort_order, badge, highlights)
values (
  'hyrox', 'HYROX', 'Tu preparación HYROX, a medida.',
  'Plan a medida para HYROX: duración, precio y lo que incluye se cierran con Jaime según tu carrera y tu nivel.',
  null, false, true, 5, 'A medida',
  array['Entrenamiento específico para HYROX: running y estaciones', 'Duración y precio a medida', 'Jaime te propone el plan después de hablar contigo']
)
on conflict (key) do nothing;

insert into public.plan_features (plan_id, feature_key, enabled, limit_value, label)
select h.id, pf.feature_key, pf.enabled, pf.limit_value, pf.label
from public.plan_features pf
join public.plans p on p.id = pf.plan_id and p.key = 'peak'
cross join (select id from public.plans where key = 'hyrox') h
on conflict do nothing;

-- Solicitudes de planes a medida que no son Peak (answers.plan = clave del plan)
alter table public.leads drop constraint if exists leads_kind_check;
alter table public.leads add constraint leads_kind_check
  check (kind in ('peak_application', 'contact', 'access_request', 'plan_application'));
