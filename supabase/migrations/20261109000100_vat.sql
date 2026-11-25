-- IVA desglosado en las facturas de Stripe (el precio ya lo incluye).
-- TODO(gestoría): confirmar el tipo de IVA del servicio de entrenamiento personal.
insert into public.settings (key, value, is_public, description) values
  ('billing.vat_percent', '21', false, 'Tipo de IVA incluido en los precios, para desglosarlo en facturas (null = no desglosar). Confirmar con la gestoría.'),
  ('billing.stripe_vat_rate', 'null', false, 'Tipo de IVA creado en Stripe (lo rellena la app)')
on conflict (key) do nothing;
