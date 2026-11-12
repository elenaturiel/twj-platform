-- Colaboración: clientes que no pagan (acuerdo con Jaime: colaboraciones, canjes…)
-- pero son clientes a todos los efectos: plan activo, créditos del mes y acceso.
-- Sin cuota, sin renovaciones y sin avisos de pago.
alter table public.clients drop constraint if exists clients_billing_mode_check;
alter table public.clients add constraint clients_billing_mode_check
  check (billing_mode in ('stripe', 'manual', 'collab'));
alter table public.subscriptions drop constraint if exists subscriptions_billing_mode_check;
alter table public.subscriptions add constraint subscriptions_billing_mode_check
  check (billing_mode in ('stripe', 'manual', 'collab'));
