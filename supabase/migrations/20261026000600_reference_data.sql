-- =============================================================================
-- TWJ · 0600 · Datos de referencia (configuración inicial, editable en el panel)
-- Fuente: www.trainwithjaime.es/precios (consultada el 26-10-2026) + decisiones
-- del 26-10-2026 (docs/PLAN.md §0). Precios con IVA incluido, en céntimos.
-- =============================================================================

insert into public.plans (key, name, tagline, description, price_cents, annual_allowed, requires_application, sort_order, badge, highlights) values
  ('rookie', 'Rookie', 'Empieza a entrenar con cabeza.',
   'Entrenamiento personalizado y revisión por WhatsApp cada 15 días.',
   2490, true, false, 1, null,
   array['Plan de entrenamiento personalizado (gym o running)', 'Actualización cada 4 semanas', 'Revisión por WhatsApp cada 15 días', 'Análisis de técnica en vídeo limitado', 'Comunidad WhatsApp: tips semanales + reto mensual']),
  ('all_in', 'All In', 'Entrenamiento + nutrición. Todo dentro.',
   'Entrenamiento + nutrición, revisión semanal y videollamada mensual.',
   4490, true, false, 2, 'El más elegido',
   array['Todo lo de Rookie', 'Plan nutricional para presupuesto de estudiante', 'Recetas Mercadona, tuppers y comer fuera sin salirte', 'Revisión semanal por WhatsApp', '1 videollamada al mes con Jaime', 'Análisis de técnica en vídeo ilimitado']),
  ('mvp', 'MVP', 'Jaime contigo en tus entrenos clave. Tú juegas, él te lleva.',
   'Todo lo de All In + 2 entrenos al mes en directo con Jaime por videollamada.',
   6490, true, false, 3, 'Precio fundador',
   array['Todo lo de All In', '2 entrenos al mes en directo con Jaime (~1 h)', 'Corrección de técnica, cargas y ritmo en directo', 'Resumen de cada sesión con tus 3 objetivos', 'Test inicial y retest cada 4 semanas', 'Respuesta prioritaria por WhatsApp']),
  ('peak', 'Peak', 'Prepárate para tu día. Fecha, plan y objetivo claros.',
   'Pack a medida de 8, 10 o 12 semanas para tu evento (HYROX, media maratón…). Todo lo de MVP, hecho a tu medida.',
   null, false, true, 4, 'A medida',
   array['Todo lo de MVP', 'Sesión de arranque 1:1 (45 min)', 'Entrenamiento 100 % personalizado para tu evento', 'Menú y plan nutricional a medida', 'Plan del día del evento', 'Seguimiento semanal prioritario']);

insert into public.plan_prices (plan_id, interval, amount_cents)
select id, 'month', price_cents from public.plans where price_cents is not null;
-- Anual: precio de lista = 12 × mensual; el −20 % anual es un descuento que se suma a los demás.
insert into public.plan_prices (plan_id, interval, amount_cents)
select id, 'year', price_cents * 12 from public.plans where price_cents is not null and annual_allowed;

insert into public.features (key, name, description, kind, unit, sort_order) values
  ('training_plan',       'Plan de entrenamiento personalizado', null, 'bool', null, 10),
  ('workout_logging',     'Registro de entrenos y récords', null, 'bool', null, 11),
  ('technique_analysis',  'Análisis de técnica en vídeo', 'Vídeos al mes (vacío = ilimitado)', 'limit', 'per_month', 12),
  ('retest',              'Test inicial y retest cada 4 semanas', null, 'bool', null, 13),
  ('nutrition_plan',      'Plan nutricional y menú semanal', null, 'bool', null, 20),
  ('shopping_list',       'Lista de la compra automática', null, 'bool', null, 21),
  ('checkins',            'Revisiones (check-in)', 'Cada cuántos días', 'limit', 'days', 30),
  ('progress',            'Progreso y métricas', null, 'bool', null, 31),
  ('monthly_call',        'Videollamada mensual con Jaime', 'Llamadas al mes', 'limit', 'per_month', 40),
  ('live_sessions',       'Entrenos en directo por videollamada', 'Sesiones al mes', 'limit', 'per_month', 41),
  ('session_summary',     'Resumen de sesión con 3 objetivos', null, 'bool', null, 42),
  ('extra_sessions',      'Comprar sesiones extra de 1 h', null, 'bool', null, 43),
  ('priority_support',    'Respuesta prioritaria', null, 'bool', null, 50),
  ('chat',                'Chat en la app (dudas puntuales)', null, 'bool', null, 51),
  ('kickoff_session',     'Sesión de arranque 1:1 (45 min)', null, 'bool', null, 60),
  ('event_day_plan',      'Plan del día del evento', null, 'bool', null, 61),
  ('challenges',          'Retos y medallas', null, 'bool', null, 70),
  ('whatsapp_community',  'Comunidad WhatsApp', 'Tips semanales y reto mensual', 'bool', null, 71);

-- Matriz por defecto (según la web). enabled=false → la UI muestra "Esto va en el plan …".
with m(plan_key, feature_key, enabled, limit_value, label) as (values
  ('rookie','training_plan',true,null,'Gym o running'),
  ('rookie','workout_logging',true,null,null),
  ('rookie','technique_analysis',true,2,'Limitado'),  -- TODO(Jaime): confirmar el límite de vídeos/mes en Rookie
  ('rookie','retest',false,null,null),
  ('rookie','nutrition_plan',false,null,null),
  ('rookie','shopping_list',false,null,null),
  ('rookie','checkins',true,14,'Cada 15 días'),
  ('rookie','progress',true,null,null),
  ('rookie','monthly_call',false,null,null),
  ('rookie','live_sessions',false,null,null),
  ('rookie','session_summary',false,null,null),
  ('rookie','extra_sessions',false,null,null),
  ('rookie','priority_support',false,null,null),
  ('rookie','chat',true,null,null),
  ('rookie','kickoff_session',false,null,null),
  ('rookie','event_day_plan',false,null,null),
  ('rookie','challenges',true,null,null),
  ('rookie','whatsapp_community',true,null,null),

  ('all_in','training_plan',true,null,null),
  ('all_in','workout_logging',true,null,null),
  ('all_in','technique_analysis',true,null,'Ilimitado'),
  ('all_in','retest',false,null,null),
  ('all_in','nutrition_plan',true,null,null),
  ('all_in','shopping_list',true,null,null),
  ('all_in','checkins',true,7,'Semanal'),
  ('all_in','progress',true,null,null),
  ('all_in','monthly_call',true,1,'1 al mes'),
  ('all_in','live_sessions',false,null,null),
  ('all_in','session_summary',false,null,null),
  ('all_in','extra_sessions',false,null,null),
  ('all_in','priority_support',false,null,null),
  ('all_in','chat',true,null,null),
  ('all_in','kickoff_session',false,null,null),
  ('all_in','event_day_plan',false,null,null),
  ('all_in','challenges',true,null,null),
  ('all_in','whatsapp_community',true,null,null),

  ('mvp','training_plan',true,null,null),
  ('mvp','workout_logging',true,null,null),
  ('mvp','technique_analysis',true,null,'Ilimitado'),
  ('mvp','retest',true,null,null),
  ('mvp','nutrition_plan',true,null,null),
  ('mvp','shopping_list',true,null,null),
  ('mvp','checkins',true,7,'Semanal'),
  ('mvp','progress',true,null,null),
  ('mvp','monthly_call',true,1,'1 al mes'),
  ('mvp','live_sessions',true,2,'2 al mes (~1 h)'),
  ('mvp','session_summary',true,null,null),
  ('mvp','extra_sessions',true,null,null),
  ('mvp','priority_support',true,null,null),
  ('mvp','chat',true,null,null),
  ('mvp','kickoff_session',false,null,null),
  ('mvp','event_day_plan',false,null,null),
  ('mvp','challenges',true,null,null),
  ('mvp','whatsapp_community',true,null,null),

  ('peak','training_plan',true,null,'100 % para tu evento'),
  ('peak','workout_logging',true,null,null),
  ('peak','technique_analysis',true,null,'Ilimitado'),
  ('peak','retest',true,null,null),
  ('peak','nutrition_plan',true,null,'A medida, ajustado cada semana'),
  ('peak','shopping_list',true,null,null),
  ('peak','checkins',true,7,'Semanal prioritaria'),
  ('peak','progress',true,null,null),
  ('peak','monthly_call',true,1,'1 al mes'),
  ('peak','live_sessions',true,2,'2 al mes (~1 h)'),
  ('peak','session_summary',true,null,null),
  ('peak','extra_sessions',true,null,null),
  ('peak','priority_support',true,null,null),
  ('peak','chat',true,null,null),
  ('peak','kickoff_session',true,null,null),
  ('peak','event_day_plan',true,null,null),
  ('peak','challenges',true,null,null),
  ('peak','whatsapp_community',true,null,null)
)
insert into public.plan_features (plan_id, feature_key, enabled, limit_value, label)
select p.id, m.feature_key, m.enabled, m.limit_value, m.label
from m join public.plans p on p.key = m.plan_key;

-- Descuentos de serie (sumables entre sí)
insert into public.discounts (code, name, kind, type, value, tiers, duration, applies_to_plan_keys, applies_to_intervals,
                              max_redemptions, requires_verification, auto_apply, stackable, revoke_on_cancel, description) values
  (null, 'Precio fundador MVP', 'founder', 'fixed', 500, null, 'forever', array['mvp'], null,
   6, false, true, true, true,
   'MVP a 59,90 € en vez de 64,90 € para siempre mientras siga dado de alta. Primeras 6 plazas. Si se da de baja, lo pierde.'),
  (null, 'Carné universitario', 'student', 'percent', 10, null, 'forever', null, null,
   null, true, false, true, false,
   '−10 % con carné universitario verificado por Jaime.'),
  (null, 'Squad', 'squad', 'tiered_percent', null, '[{"min_friends":2,"percent":15},{"min_friends":3,"percent":25}]'::jsonb,
   'forever', array['rookie', 'all_in'], null,
   null, false, false, true, false,
   '2 amigos (3 personas) −15 % cada uno; 3 amigos (4 personas) −25 % cada uno. Tope en 3 amigos. Si alguien se da de baja, todos bajan de tramo.'),
  (null, 'Pago anual', 'annual', 'percent', 20, null, 'forever', array['rookie', 'all_in', 'mvp'], array['year'],
   null, false, true, true, false,
   '−20 % pagando el año entero. Se suma a los demás descuentos.');

insert into public.settings (key, value, is_public, description) values
  ('brand.name', '"Train with Jaime"', true, 'Nombre de la marca'),
  ('brand.tagline', '"¿Y tú, quieres ganar?"', true, 'Lema'),
  ('contact.whatsapp_number', '"+34684034156"', true, 'WhatsApp de urgencias (formato internacional)'),
  ('contact.email', '"trainwithjaimesanz@gmail.com"', true, 'Email de contacto'),
  ('billing.grace_days', '5', false, 'Días de gracia en past_due antes de cortar el acceso'),
  ('billing.manual_reminder_offsets', '[-3, 0, 3]', false, 'Recordatorios de pago manual (días respecto al vencimiento)'),
  ('billing.extra_session_price_cents', '2500', true, 'Precio de la sesión extra de 1 h (IVA incl.)'),
  ('billing.founder_reservation_minutes', '30', false, 'Minutos que se reserva una plaza fundador durante el pago'),
  ('billing.discount_warning_percent', '50', false, 'Aviso en el panel si la suma de descuentos supera este %'),
  ('billing.max_total_discount_percent', 'null', false, 'Tope de la suma de descuentos (null = sin tope)'),
  ('checkins.default_weekday', '0', false, 'Día por defecto del check-in (0 = domingo)'),
  ('notifications.digest_hour', '20', false, 'Hora (Madrid) del resumen diario para staff'),
  ('legal.current_versions', '{"terms":"2026-10-draft","privacy":"2026-10-draft","health_data":"2026-10-draft","progress_photos":"2026-10-draft","marketing":"2026-10-draft","cookies":"2026-10-draft","guardian":"2026-10-draft","health_screening":"2026-10-draft"}', true, 'Versión vigente de cada texto legal'),
  ('privacy.retention_months_after_cancel', '24', false, 'Meses que se conservan datos de entreno/salud tras la baja (fiscales aparte)');

insert into public.message_templates (key, channel, subject, body, variables, description) values
  ('welcome', 'email', '¡Dentro! Bienvenido/a a TWJ',
   'Hola {{nombre}}:\n\nPago confirmado y plan {{plan}} activado. Ahora rellena tu ficha (5 minutos, prometido) para que Jaime te prepare el plan.\n\n{{enlace}}\n\n¿Y tú, quieres ganar?',
   array['nombre', 'plan', 'enlace'], 'Email de bienvenida tras el primer pago'),
  ('client_profile_changed', 'email', '{{cliente}} ha cambiado su ficha',
   '{{cliente}} ha actualizado: \n{{cambios}}\n\nVer ficha: {{enlace}}',
   array['cliente', 'cambios', 'enlace'], 'Aviso a staff cuando un cliente edita sus datos'),
  ('payment_reminder', 'email', 'Tu cuota de TWJ vence el {{fecha}}',
   'Hola {{nombre}}: tu cuota de {{plan}} ({{importe}}) vence el {{fecha}}. Si ya la has pagado, ignora este mensaje (y gracias).',
   array['nombre', 'plan', 'importe', 'fecha'], 'Recordatorio de pago manual'),
  ('payment_failed', 'email', 'No hemos podido cobrar tu cuota',
   'Hola {{nombre}}: el cobro de tu cuota ha fallado. Actualiza tu tarjeta aquí: {{enlace}}. Tienes hasta el {{fecha}} antes de que se pause el acceso.',
   array['nombre', 'enlace', 'fecha'], 'Pago fallido (Stripe)'),
  ('guardian_request', 'email', '{{nombre}} quiere entrenar con Train with Jaime',
   'Hola {{tutor}}:\n\n{{nombre}} es menor de edad y necesita tu autorización para usar la plataforma de Train with Jaime. Puedes revisarlo y autorizarlo aquí: {{enlace}}\n\nEl enlace caduca en 7 días.',
   array['tutor', 'nombre', 'enlace'], 'Solicitud de autorización al tutor legal');
