-- Los créditos mensuales se conceden con upsert (on conflict client_id, credit_type,
-- period_start). Un índice único PARCIAL no le sirve a PostgREST para el on conflict
-- y el insert fallaba: nadie recibía sus créditos al pagar. Solo las concesiones
-- mensuales llevan period_start (el resto lo tiene a null, y los null no chocan).
drop index if exists public.session_credits_grant_once_idx;
create unique index session_credits_grant_once_idx on public.session_credits (client_id, credit_type, period_start);
