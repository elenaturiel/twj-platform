-- =============================================================================
-- TWJ · 0700 · Flujo de alta y cobro: checkout, reserva de plazas fundador sin
--              carreras, pérdida del fundador al darse de baja.
-- =============================================================================

alter table public.subscriptions
  add column checkout_session_id text unique,
  add column pending_discount_ids uuid[] not null default '{}';

comment on column public.subscriptions.checkout_session_id is 'Sesión de Stripe Checkout (cs_…) o del simulador local (mock_…)';

-- Reserva atómica de una plaza fundador: el bloqueo asesor serializa a quienes
-- pagan a la vez, así nunca se vende la 7.ª plaza.
create or replace function public.reserve_founder_slot(p_client_id uuid, p_subscription_id uuid, p_minutes integer default 30)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_discount uuid;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('twj:founder_slots'));

  select d.id into v_discount
  from public.discounts d
  where d.kind = 'founder' and d.is_active
  order by d.created_at
  limit 1;

  if v_discount is null or coalesce(public.founder_slots_left(), 0) <= 0 then
    return null;
  end if;

  -- Quien ya lo tuvo y se dio de baja, lo pierde para siempre
  if exists (
    select 1 from public.discount_redemptions r
    where r.discount_id = v_discount and r.client_id = p_client_id and r.status = 'revoked'
  ) then
    return null;
  end if;

  insert into public.discount_redemptions (discount_id, client_id, subscription_id, status, reserved_until)
  values (v_discount, p_client_id, p_subscription_id, 'reserved', now() + make_interval(mins => p_minutes))
  returning id into v_id;

  return v_id;
end;
$$;

-- Al cancelar una suscripción: se revocan los descuentos con revoke_on_cancel (fundador)
-- y el cliente sale de su squad.
create or replace function public.on_subscription_cancelled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.discount_redemptions r
    set status = 'revoked', revoked_at = now()
    from public.discounts d
    where r.discount_id = d.id
      and r.subscription_id = new.id
      and r.status in ('reserved', 'applied')
      and d.revoke_on_cancel;

    update public.discount_redemptions
    set status = 'expired'
    where subscription_id = new.id and status = 'reserved';

    update public.squad_members
    set left_at = now()
    where client_id = new.client_id and left_at is null;
  end if;
  return new;
end;
$$;

create trigger subscriptions_on_cancel after update of status on public.subscriptions
  for each row execute function public.on_subscription_cancelled();

-- Limpieza de reservas caducadas (la llama el cron de cobros)
create or replace function public.expire_discount_reservations()
returns integer
language sql
security definer
set search_path = ''
as $$
  with expired as (
    update public.discount_redemptions
    set status = 'expired'
    where status = 'reserved' and reserved_until is not null and reserved_until < now()
    returning 1
  )
  select count(*)::int from expired;
$$;

-- Solo el servidor (service_role) usa estas funciones.
revoke all on function public.reserve_founder_slot(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.expire_discount_reservations() from public, anon, authenticated;
