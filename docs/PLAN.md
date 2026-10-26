# TWJ App — Plan de arquitectura (v0.1, pendiente de OK)

> Documento previo a escribir código (punto 16.1 del brief). Contiene: arquitectura, modelo de datos, pantallas, fases, riesgos y dudas.
> Todo lo marcado **[DECIDIR]** necesita respuesta vuestra; lo marcado **[DEFECTO]** es la opción que tomaré si no decís otra cosa.

---

## 1. Visión general

```mermaid
flowchart LR
  subgraph Cliente["Navegador / PWA (luego Capacitor)"]
    UI[Next.js App Router<br/>RSC + Client Components]
    SW[Service Worker<br/>offline + Web Push]
  end
  subgraph Vercel["Vercel (fra1) — app.trainwithjaime.es"]
    RSC[Server Components<br/>+ Server Actions]
    API[Route Handlers<br/>/api/webhooks · /api/cron · /api/r]
  end
  subgraph Supabase["Supabase (región UE)"]
    PG[(Postgres + RLS)]
    AUTH[Auth<br/>email · magic link · Google]
    ST[Storage privado<br/>URLs firmadas]
    RT[Realtime<br/>chat]
    CRON[pg_cron + pg_net]
  end
  STRIPE[Stripe<br/>Checkout · Billing · Portal]
  RESEND[Resend<br/>React Email]
  GCAL[Google Calendar<br/>+ Meet]
  OFF[Open Food Facts]

  UI <--> RSC
  UI <--> RT
  UI --> ST
  SW <-- push --- API
  RSC --> PG
  API --> PG
  STRIPE -- webhooks --> API
  RSC --> STRIPE
  API --> RESEND
  API --> GCAL
  RSC --> OFF
  CRON -- llama con secreto --> API
```

### Principios

1. **Postgres es la fuente de verdad y RLS es la frontera de seguridad.** El código de la app usa siempre el cliente de Supabase *del usuario* (con RLS). El cliente `service_role` solo existe en `src/lib/supabase/admin.ts` (marcado `server-only`) y solo se usa en webhooks, crons y procesos de sistema.
2. **Lógica de negocio crítica en funciones puras** (`src/domain/*`): renovaciones, descuentos, lista de la compra, macros, retos, rachas, récords. Sin dependencias de framework → test unitario fácil y reutilizable en servidor, cliente y tests.
3. **Outbox para efectos secundarios**: cualquier evento (cliente edita su ficha, check-in recibido, pago fallido…) inserta una fila en `notification_outbox` (a veces desde un trigger de BD). Un worker la despacha a in-app / email / push según preferencias o la agrupa en el resumen diario. Así no se pierden avisos aunque falle Resend o un push.
4. **Todo lo configurable vive en BD** (planes, funciones por plan, descuentos, textos de emails, WhatsApp, periodo de gracia, plazas fundador, retención…), editable desde `/panel/ajustes`. Nada de “tocar código para cambiar un precio”.
5. **Mobile-first y Capacitor-friendly desde el día 1** (ver §1.6).

### 1.1 Stack (versiones exactas se fijan al crear el proyecto)

| Capa | Elección | Nota |
|---|---|---|
| Framework | Next.js (última estable, ≥16) App Router, React 19, TypeScript `strict` + `noUncheckedIndexedAccess` | |
| Estilos | Tailwind CSS v4 (tokens en CSS con `@theme`) + shadcn/ui + `next-themes` | Un único fichero de tokens: `src/styles/tokens.css` |
| Formularios / validación | React Hook Form + Zod (mismos esquemas en cliente y servidor) | |
| Datos en cliente | TanStack Query (solo donde hay interactividad: registro de entrenos, chat, lista de la compra) con persistencia en IndexedDB para offline | El resto, Server Components |
| Gráficas | Recharts | |
| BD/Auth/Storage/Realtime | Supabase (`@supabase/ssr`), proyecto en **región UE** | |
| Pagos | Stripe (Checkout, Billing, Customer Portal, Coupons/Promotion Codes, webhooks) — modo test | |
| Email | Resend + React Email | Dominio de envío en subdominio (ver §1.5) |
| Push | Web Push (VAPID, librería `web-push`) tras una interfaz `NotificationChannel` | Añadir APNs/FCM = nuevo canal, sin tocar el resto |
| Calendario | Google Calendar API (`googleapis`), eventos con `conferenceData.createRequest` (Meet) | |
| PWA | Service worker con Serwist (o SW propio si no es compatible con la versión de Next) | |
| Excel | ExcelJS (o SheetJS CE desde su CDN oficial — **no** el paquete `xlsx` de npm, abandonado y con CVEs) | |
| Tests | Vitest (unitarios), Playwright (E2E), pgTAP vía `supabase test db` (RLS) | |
| CI/CD | GitHub Actions (lint, typecheck, unit, RLS, E2E) + Vercel (preview por PR, prod en `app.trainwithjaime.es`) | |
| Gestor de paquetes | pnpm | |
| i18n | `next-intl` con un único locale `es-ES` y mensajes en `src/i18n/messages/es/*.json` | Cambiar un texto = editar un JSON |

### 1.2 Estructura del repositorio

```
twj-platform/
├─ src/
│  ├─ app/
│  │  ├─ (public)/          # /empezar, /hyrox, /legal/*, /login, /tutor/[token]
│  │  ├─ (client)/          # app del cliente: /hoy, /entreno, /nutricion, /progreso, /perfil…
│  │  ├─ panel/             # panel de Jaime/Elena
│  │  ├─ embed/             # banner HYROX embebible en la web
│  │  └─ api/               # webhooks/stripe, cron/[job], r/[link] (afiliados), google/oauth
│  ├─ features/<dominio>/   # componentes, server actions y queries por dominio (billing, training, nutrition…)
│  ├─ domain/               # lógica pura + tests (billing, discounts, shopping, macros, streaks, challenges, records)
│  ├─ components/ui/        # shadcn/ui
│  ├─ components/twj/       # componentes de marca (EmptyState, LockedFeature, Medal, WhatsAppButton…)
│  ├─ lib/                  # supabase/, stripe/, email/, notifications/, calendar/, push/, storage/, audit/
│  ├─ i18n/                 # configuración + messages/es/*.json
│  └─ styles/               # tokens.css (colores, radios, sombras), fonts.ts (next/font)
├─ emails/                  # plantillas React Email
├─ supabase/
│  ├─ migrations/           # SQL versionado (una o varias por fase)
│  ├─ tests/                # pgTAP (RLS)
│  └─ seed/                 # seed.ts (datos ficticios deterministas)
├─ tests/e2e/               # Playwright
├─ public/                  # manifest, iconos, logo.svg (TODO)
├─ .github/workflows/ci.yml
├─ .env.example
└─ README.md
```

### 1.3 Rutas y control de acceso

- `app.trainwithjaime.es/` redirige según rol: cliente → `/hoy`, staff → `/panel`, anónimo → `/login`.
- `middleware.ts` solo refresca la sesión de Supabase y bloquea rutas por autenticación. **El control fino no va en el middleware** sino en los layouts (`(client)/layout.tsx`, `panel/layout.tsx`) y, sobre todo, en RLS.
- Gate de acceso del cliente (layout): `clients.status` ∈ {`active`, `past_due` dentro de gracia} **y** onboarding completo **y** (si es menor) autorización del tutor confirmada. Si no, redirige a la pantalla que toque (`/empezar/confirmando`, `/onboarding`, `/tutor-pendiente`, `/cuenta/pago-pendiente`).
- Gate de funciones por plan: helper `hasFeature(client, 'chat')` en servidor + función SQL `has_feature()` usada en las políticas RLS de las tablas afectadas (p. ej. no se puede insertar en `messages` sin la función `chat`). La UI pinta `<LockedFeature plan="All In" />` con botón de mejora.

### 1.4 Autenticación y roles

- Supabase Auth: email + contraseña, magic link y Google OAuth. SMTP propio vía Resend (el SMTP por defecto de Supabase tiene límites muy bajos).
- `profiles.role` ∈ `owner | admin | client`. Se inyecta en el JWT con un **Custom Access Token Hook** para que RLS no tenga que hacer joins en cada consulta; las funciones SQL `is_staff()`, `my_client_id()` y `has_scope()` lo leen.
- Permisos de admin restringibles: tabla `staff_permissions` con scopes (`clients`, `health`, `billing`, `business`, `settings`, `team`). **[DEFECTO]** Elena con todos los scopes.
- Alta de clientes manuales: Jaime crea el cliente en el panel → invitación por email (`inviteUserByEmail`) → el cliente pone contraseña o entra con Google.

### 1.5 Dominio y DNS (sin tocar trainwithjaime.es)

1. En Vercel: Proyecto → Settings → Domains → añadir `app.trainwithjaime.es`.
2. En el proveedor DNS de `trainwithjaime.es`: crear **un único registro** `CNAME` con nombre `app` y el valor que indique Vercel (p. ej. `cname.vercel-dns.com` o el específico del proyecto). **No** se tocan los registros `A`/`AAAA` del dominio raíz, `www` ni `MX`.
3. Si existe un registro `CAA`, debe permitir `letsencrypt.org`.
4. Emails: verificar en Resend un **subdominio de envío** (p. ej. `mail.trainwithjaime.es`) con sus registros SPF/DKIM (TXT/MX propios del subdominio). Así no interfiere con el correo actual del dominio raíz. Remitente: `Jaime de TWJ <hola@mail.trainwithjaime.es>` **[DECIDIR remitente]**.

### 1.6 PWA ahora, Capacitor después

- Manifest + iconos + service worker (instalable; push en iOS solo funciona con la PWA añadida a la pantalla de inicio, iOS ≥16.4).
- Sin APIs exclusivas de navegador de escritorio; nada que dependa de `window.open` para flujos críticos.
- Deep links: rutas planas y estables (`/entreno/sesion/[id]`, `/chat`, `/progreso/checkin`) para mapearlas a Universal Links.
- Sesión: cookies de `@supabase/ssr` (funcionan en WKWebView cargando el dominio). Se deja aislado en `src/lib/supabase/` por si en Capacitor hay que pasar a almacenamiento nativo.
- **Pagos fuera de la app iOS**: ver riesgo R1 (§6).

### 1.7 Pagos: diseño

- **Precios en céntimos (enteros), EUR.** Fechas de periodo en tipo `date` y zona `Europe/Madrid`.
- **El motor de descuentos propio (`src/domain/discounts`) es la fuente de verdad**; Stripe es el ejecutor. El cliente escribe el código en nuestra UI (no en la de Stripe), lo validamos, mostramos el precio final y creamos el Checkout con el descuento ya resuelto.
- Limitación de Stripe: Checkout acepta **un solo descuento**. Una suscripción admite varios. Por eso:
  - Descuentos no acumulables (por defecto): se pasa el cupón correspondiente al Checkout.
  - Acumulables: el primer cobro se cuadra con un cupón puntual `once` equivalente; los descuentos recurrentes se añaden a la suscripción al confirmar el pago (webhook).
- Cada plan tiene un `Product` en Stripe; cada cambio de precio crea un `Price` nuevo y archiva el anterior (los `Price` son inmutables). Qué pasa con los clientes existentes → **[DECIDIR]** (R7).
- Webhooks idempotentes: tabla `stripe_events` (id del evento como PK) — si llega dos veces, se ignora.
- Eventos tratados: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated/deleted`, `charge.refunded`.
- Plazas fundador: reserva temporal (30 min) al iniciar el Checkout para no vender la 7.ª plaza si dos personas pagan a la vez; se libera si el Checkout expira.
- **Modo manual**: Jaime registra pago (método, importe, fecha, periodo cubierto). `src/domain/billing/renewal.ts` calcula el siguiente vencimiento (mensual, anclado al día de alta con ajuste a fin de mes: 31-ene → 28/29-feb → 31-mar). Recordatorios: −3 días, día D, y +N días (gracia). Todo configurable.
- **Migrar de manual a Stripe**: botón que genera un Checkout cuyo primer cobro empieza el día de la próxima renovación (`subscription_data.trial_end` = fecha de renovación, así no se cobra dos veces el mes ya pagado) y lo envía por email.

### 1.8 Notificaciones

```
evento → notify({ type, recipients, payload })
        → notifications (in-app, siempre)
        → notification_outbox (email / push) según notification_preferences
        → worker (/api/cron/notifications cada minuto) → canal Email (Resend) / WebPush / [futuro APNs/FCM]
        → si el usuario tiene "resumen diario": se acumula y sale en /api/cron/digest
```

- Tareas programadas con **Supabase `pg_cron` + `pg_net`** llamando a `/api/cron/*` con un secreto. Motivo: Vercel Cron en plan Hobby solo permite ejecuciones diarias; con pg_cron tenemos granularidad de minuto en cualquier plan. (Alternativa: Vercel Cron si contratáis Vercel Pro.)
- Textos de notificaciones y emails: plantilla base en código (React Email) + textos editables desde el panel (`message_templates`), con variables (`{{nombre}}`, `{{plan}}`…).

### 1.9 Privacidad y seguridad (resumen; detalle en Fase 8)

- RLS en todas las tablas; test automático que **falla si alguna tabla de `public` no tiene RLS** o si un cliente puede leer filas de otro (ver §2.12).
- Buckets privados: `progress-photos`, `student-cards`, `technique-videos`, `chat-media`, `voice-notes`, `documents`. Ruta `/{client_id}/…`; políticas de Storage por carpeta; URLs firmadas de 60–300 s generadas en servidor (y registradas en `audit_log`).
- `audit_log`: triggers en tablas sensibles (cambios) + registro desde la app de **accesos** (staff abre ficha de salud, ve fotos, exporta datos), porque Postgres no puede auditar `SELECT` con triggers.
- Cifrado: TLS en tránsito; en reposo, cifrado de disco de Supabase/Storage. Tokens de terceros (Google refresh token) en **Supabase Vault**.
- Retención configurable y job de purga/anonimización.

---

## 2. Modelo de datos

Convenciones: `id uuid default gen_random_uuid()`, `created_at/updated_at timestamptz`, enumerados como `text + CHECK` (más fáciles de ampliar que los `enum` de Postgres), dinero en `*_cents int`, `client_id` en toda tabla que pertenezca a un cliente (para que la política RLS sea uniforme). Las migraciones se escriben **por fases**, pero el modelo completo se diseña ahora para no rehacer nada.

Tablas que **añado** a vuestra lista (marcadas ➕) con su motivo.

### 2.1 Identidad y cumplimiento

| Tabla | Columnas principales | Notas |
|---|---|---|
| `profiles` | id (=auth.users.id), role, full_name, email, phone, avatar_path, timezone, theme, locale, deleted_at | 1:1 con auth.users |
| ➕ `staff_permissions` | profile_id, scope | Para restringir a admin |
| `clients` | id, profile_id (unique), status (`pending_payment/active/past_due/paused/cancelled`), plan_id, billing_mode (`stripe/manual`), modalities text[] (`gym/functional/running/hyrox`), tags text[], referral_code (unique), referred_by_client_id, stripe_customer_id, is_minor, guardian_status, onboarding_completed_at, checkin_frequency, checkin_weekday, last_activity_at, started_at, cancelled_at | Solo staff puede modificarla (salvo nada; el cliente solo lee) |
| ➕ `client_intake` | client_id (PK), goal, birth_date, injuries, experience, available_days smallint[], equipment (`gym/home/both`), equipment_notes, allergens text[] (14 alérgenos UE) + allergy_notes, food_budget_cents + budget_period, class_schedule jsonb | **La ficha de onboarding (exactamente los campos del brief).** Separada de `clients` para que RLS sea simple: el cliente puede editar esta tabla y no la de estado/plan |
| ➕ `health_screenings` | client_id, version, answers jsonb, has_flags bool, reviewed_by, reviewed_at | Cuestionario tipo PAR-Q |
| ➕ `onboarding_calls` | client_id, held_at, notes, agreed_goals, metrics_to_track, initial_blocks, observations | Solo staff. Sustituye la pestaña "Llamada Onboarding" |
| ➕ `client_notes` | client_id, author_id, body, pinned | Notas privadas, solo staff |
| `consents` | profile_id, kind (`health_data/progress_photos/marketing/cookies/terms/privacy/guardian`), granted, document_version, ip, user_agent, created_at | Solo inserción (append-only); el estado vigente es la última fila por tipo |
| ➕ `legal_documents` | kind, version, title, body_md, published_at, is_draft | Textos legales versionados y editables |
| `guardian_authorizations` | client_id, guardian_name, guardian_email, token_hash, sent_at, confirmed_at, ip | El tutor confirma desde un enlace en su email (no basta un check del menor) |
| `profile_changes` | client_id, changed_by, table_name, field, old_value jsonb, new_value jsonb, created_at, notified_at | Lo rellena un trigger en `client_intake`, `custom_field_values` y `profiles` |
| `audit_log` | actor_id, action, entity, entity_id, client_id, metadata jsonb, ip, created_at | Solo inserción; solo owner lee |
| ➕ `documents` | client_id, kind, storage_path, title, uploaded_by | Pestaña "Consentimientos y documentos" |

### 2.2 Negocio y cobros

| Tabla | Columnas principales | Notas |
|---|---|---|
| `plans` | key (`rookie/all_in/mvp/peak`), name, description, price_cents, interval, sort_order, is_active, is_public, requires_application (Peak), stripe_product_id, stripe_price_id | |
| ➕ `plan_prices` | plan_id, price_cents, stripe_price_id, valid_from, valid_to | Histórico de precios (Stripe no permite editar un Price) |
| ➕ `features` | key, name, description, kind (`bool/limit`) | Catálogo de funciones |
| `plan_features` | plan_id, feature_key, enabled, limit_value | Ej.: `live_sessions` limit 2 en MVP |
| ➕ `client_feature_overrides` | client_id, feature_key, enabled, limit_value, reason | Para Peak "100 % personalizable" y excepciones |
| `subscriptions` | client_id, plan_id, billing_mode, status, price_cents (precio pactado), current_period_start/end (date), grace_until, cancel_at_period_end, paused_until, stripe_subscription_id, started_at, ended_at | Histórico: una fila por suscripción |
| `payments` | client_id, subscription_id, kind (`subscription/extra_session/peak/other`), method (`stripe/bizum/transfer/cash/other`), amount_cents, discount_cents, paid_at, period_start, period_end, status (`pending/paid/failed/refunded`), stripe_invoice_id, stripe_payment_intent_id, recorded_by, notes | Unifica cobros Stripe y manuales → métricas de negocio sobre una sola tabla |
| `invoices_manual` | payment_id, number, issued_at, file_path, notes | Solo archivo de facturas emitidas fuera (no hay facturación electrónica, ver R9) |
| `discounts` | code, name, kind (`squad/student/founder/custom`), type (`percent/fixed`), value, duration (`once/repeating/forever`), duration_months, applies_to_plan_ids, max_redemptions, max_per_client, expires_at, requires_verification, stackable, is_active, stripe_coupon_id, stripe_promotion_code_id | |
| `discount_redemptions` | discount_id, client_id, subscription_id, status (`reserved/applied/expired/revoked`), reserved_until, applied_at | Contador de plazas fundador = redemptions `applied` + `reserved` vigentes |
| ➕ `student_verifications` | client_id, card_path, status (`pending/approved/rejected`), reviewed_by, reviewed_at, valid_until | Foto de carnet → aprobación de Jaime |
| `referrals` | referrer_client_id, referred_client_id, code_used, status (`pending/qualified/rewarded/void`), qualified_at, referrer_redemption_id, referred_redemption_id | |
| `session_credits` | client_id, delta (+/−), reason (`monthly_grant/purchase/manual/consume/refund/expire`), period_start, expires_at, appointment_id, payment_id | Libro de movimientos; el saldo es la suma |
| ➕ `stripe_events` | id (evt_…), type, payload, processed_at, error | Idempotencia de webhooks |
| ➕ `leads` | kind (`peak_application/contact`), name, email, phone, message, answers jsonb, status, assigned_to | Solicitudes de Peak |

### 2.3 Entrenamiento

Jerarquía: **Cliente → Bloque → Semana → Sesión → Parte (modalidad/formato) → Ítem (ejercicio/tarea)**.

| Tabla | Columnas principales | Notas |
|---|---|---|
| `exercises` | name, modality, muscle_groups text[], equipment text[], video_url, video_provider (`youtube/drive/storage`), video_path, instructions, common_mistakes, tags text[], is_active | |
| ➕ `exercise_relations` | exercise_id, related_id, kind (`alternative/regression/progression`) | |
| `workout_templates` | name, description, modalities, duration_weeks, tags | Cabecera de plantilla; su contenido usa las mismas tablas con `client_id null` |
| `workout_blocks` | client_id (null = plantilla), template_id, name, goal, starts_on, duration_weeks, order, status (`draft/active/done`) | Mesociclo. "Por meses" = bloque de 4–5 semanas con nombre de mes |
| ➕ `workout_weeks` | block_id, week_index, is_deload, notes | Semanas y microciclos de descarga |
| `workout_sessions` | week_id, client_id, title, day_index, scheduled_on, order, notes, published_at | |
| ➕ `session_parts` | session_id, order, modality (`gym/functional/running/hyrox`), format (`straight/superset/circuit/amrap/emom/for_time/tabata/rounds/run/hyrox_sim`), params jsonb (time cap, rondas, trabajo/descanso, escalados…), notes | Permite mezclar fuerza + running en una sesión |
| `session_items` | part_id, exercise_id (nullable para tareas libres), order, superset_group, prescription jsonb | `prescription` validado con Zod según modalidad (ver abajo) |
| `workout_logs` | client_id, session_id, client_uuid (unique, idempotencia offline), started_at, completed_at, total_time_s, session_rpe, feeling, comment, coach_notified_at | |
| `set_logs` | workout_log_id, client_id, session_item_id, set_index, reps, load_kg, rpe, duration_s, distance_m, pace_s_per_km, hr_avg, station_key, notes | Una fila por serie/tramo/estación |
| `personal_records` | client_id, exercise_id, record_type (`max_load/e1rm/max_reps_at_load/best_time/best_pace/longest_distance/hyrox_total/hyrox_station`), value, unit, set_log_id, achieved_at | Calculado en servidor al guardar (`src/domain/records`) |
| ➕ `hyrox_stations` | key, name, order, default_distance_m / reps, weights jsonb por categoría | Las 8 estaciones oficiales; **pesos por categoría como TODO** a validar por Jaime (cambian por temporada) |
| `import_jobs` | kind (`workouts/exercises/foods`), file_path, mapping jsonb, status, row_errors jsonb, created_by, summary | |

`prescription` por modalidad (resumen):
- **gym**: `sets: [{ reps | reps_range, load_kg?, pct_rm?, rpe?, tempo?, rest_s? }]`
- **functional**: `reps | cal | distance_m | duration_s`, `scaling: {rx, scaled}`
- **running**: `segments: [{ kind: warmup|interval|recovery|steady|cooldown, distance_m?, duration_s?, pace_min?, pace_max?, hr_zone?, repeat? }]`, `run_type: rodaje|series|tempo|fartlek|tirada_larga`
- **hyrox**: `station_key`, `distance_m | reps`, `category`, `target_split_s?`

### 2.4 Nutrición

| Tabla | Columnas principales | Notas |
|---|---|---|
| `foods` | name, brand, category, supermarket_section, kcal/protein/carbs/fat/fiber/sugar/salt por 100 g, unit_name, unit_grams, pack_size_g, price_cents + price_basis (`pack/kg/unit`), allergens text[], source (`manual/off/csv`), off_barcode, **verified**, verified_by, verified_at | Datos sin verificar se muestran con aviso |
| `meal_templates` | name, description, kcal_target, tags | Cabecera; contenido con las mismas tablas y `client_id null` |
| `meal_plans` | client_id (null = plantilla), template_id, week_start (date), status (`draft/published/archived`), notes | |
| `meal_plan_days` | meal_plan_id, day_index (0–6), date | |
| ➕ `meals` | day_id, slot (`breakfast/lunch/snack/dinner/extra`), title, order | Nivel "comida": permite pedir cambio de una comida concreta |
| `meal_items` | meal_id, food_id, quantity_g, quantity_units, notes | Macros calculadas (no almacenadas) en `src/domain/macros` |
| `meal_change_requests` | client_id, meal_id / day_id, reason, status (`open/resolved/rejected`), response, resolved_by | |
| `day_notes` | client_id, date, author_id, body | Cliente y Jaime |
| `shopping_lists` | client_id, meal_plan_id, persons, generated_at, budget_cents, estimated_cents | |
| ➕ `shopping_list_items` | list_id, food_id, quantity_g, packs, estimated_cents, section, checked | Separado para marcar comprado |
| `affiliate_links` | label, description, url, code, is_active, order | HSN |
| `affiliate_clicks` | link_id, client_id (nullable), clicked_at | Vía `/api/r/[id]` → 302 |

### 2.5 Seguimiento

| Tabla | Columnas principales |
|---|---|
| `metric_definitions` | key, name, type (`number/scale/text/photo`), unit, suggested_frequency, is_system, is_active |
| `client_metrics` | client_id, metric_id, frequency (`daily/weekly/monthly`), target_value, target_direction (`up/down/keep`), is_active, activated_at |
| `metric_entries` | client_id, metric_id, value_num, value_text, recorded_on, source (`manual/checkin/integration`), checkin_id |
| `progress_photos` | client_id, storage_path, pose (`front/side/back/other`), taken_on, checkin_id |
| `checkin_templates` | name, questions jsonb (key, label, type, required, options) — **preguntas TODO** |
| `checkins` | client_id, template_id, due_on, submitted_at, status (`pending/submitted/reviewed/missed`), reviewed_by, reviewed_at, staff_reply, staff_voice_path |
| `checkin_answers` | checkin_id, question_key, value jsonb |
| `custom_fields` | key, label, type (`text/number/select/date`), options, client_editable, is_active |
| `custom_field_values` | client_id, field_id, value jsonb (fila con valor nulo = campo asignado sin rellenar) |

### 2.6 Comunicación y agenda

| Tabla | Columnas principales |
|---|---|
| `conversations` | client_id (unique), last_message_at |
| `messages` | conversation_id, client_id, sender_id, body, attachment_path, attachment_type (`image/video/audio`), created_at |
| ➕ `conversation_reads` | conversation_id, profile_id, last_read_at (estado de lectura) |
| ➕ `appointment_types` | key (`live_training/review/onboarding_call/technique`), name, duration_min, credit_cost, min_notice_h, cancel_notice_h, buffer_min, bookable_by_client |
| `availability` | weekday, start_time, end_time, appointment_type_keys text[] |
| ➕ `availability_exceptions` | starts_at, ends_at, kind (`blocked/extra`), reason (vacaciones…) |
| `appointments` | client_id, type_key, starts_at, ends_at, status (`confirmed/cancelled/completed/no_show`), google_event_id, meet_url, credit_movement_id, cancelled_by, cancel_reason |
| `notifications` | profile_id, type, title, body, link, read_at, created_at |
| ➕ `notification_outbox` | notification_id, profile_id, channel (`email/push`), status, attempts, scheduled_for, digest bool, sent_at, error |
| `notification_preferences` | profile_id, type, channel, enabled, digest |
| `push_subscriptions` | profile_id, endpoint, p256dh, auth, user_agent, last_used_at |
| ➕ `message_templates` | key, channel, subject, body, variables, updated_by — textos de emails/automáticos editables |
| ➕ `google_connections` | profile_id, google_email, calendar_id, vault_secret_id (refresh token en Vault), connected_at |

### 2.7 Gamificación

| Tabla | Columnas principales |
|---|---|
| `challenges` | title, description, starts_on, ends_on, rule jsonb (`{type:"workouts_count", n:12, window_days:28}`, `steps_total`, `distance_single`, `checkin_streak`…), badge_id, plan_ids, is_template, is_active |
| `challenge_participants` | challenge_id, client_id, joined_at, progress, completed_at |
| `badges` | key, name, description, icon_path, kind (`challenge/streak/milestone`) |
| `client_badges` | client_id, badge_id, awarded_at, source_id, seen_at (para lanzar la animación una vez) |
| `streaks` | client_id, kind (`workouts/checkins`), current, longest, last_period |

Sin vistas ni funciones que agreguen datos de varios clientes accesibles por clientes. **No hay rankings.**

### 2.8 Marketing

| Tabla | Columnas principales |
|---|---|
| ➕ `hyrox_events` | name, city, event_date (14-11-2026 de serie), is_active |
| `waitlist_hyrox` | event_id, name, email, category (`individual/doubles/relay`), target_date, level, consent_version, consent_at, tags, utm jsonb, source, status |
| ➕ `banner_events` | banner_key, event (`view/click/submit`), session_hash, referrer, created_at — sin datos personales ni cookies, para no requerir consentimiento |
| `settings` | key, value jsonb, updated_by (WhatsApp, marca, periodo de gracia, plazas fundador, recordatorios, retención…) |

### 2.9 Integraciones (Fase 9, tablas creadas ya vacías)

| Tabla | Columnas principales |
|---|---|
| `integrations` | client_id, provider (`garmin/strava/apple_health`), status, external_user_id, scopes, vault_secret_id, connected_at, last_sync_at |
| `integration_activities` | client_id, provider, external_id (unique por proveedor), type, started_at, duration_s, distance_m, hr_avg, payload jsonb, workout_log_id |

Las métricas importadas entran en `metric_entries` con `source = 'integration'`, así gráficas y retos ya funcionan con ellas.

### 2.10 Vistas y funciones SQL clave

- `is_staff()`, `my_client_id()`, `has_scope(scope)`, `has_feature(client_id, key)` → `security definer`, `stable`, `search_path` fijado.
- `client_has_access(client_id)` → estado + gracia + onboarding + tutor.
- `client_credit_balance(client_id)`.
- `business_metrics(from, to)` (solo staff): ingresos, MRR, ARPU, altas, bajas, churn, LTV estimado, previsión de renovaciones.
- `founder_slots_left()` → pública (solo devuelve un número).

### 2.11 Patrón RLS

```sql
-- Tablas de cliente (todas las que tienen client_id):
create policy "own_or_staff_select" on public.metric_entries
  for select using (client_id = public.my_client_id() or public.is_staff());
create policy "own_insert" on public.metric_entries
  for insert with check (client_id = public.my_client_id() and public.client_has_access(client_id));
-- Tablas solo staff (client_notes, onboarding_calls, audit_log…): solo is_staff() / has_scope().
-- Catálogos (exercises, foods, plans públicos, badges): select para authenticated; escritura solo staff.
-- Público (anon): insert en waitlist_hyrox, banner_events y leads; select de plans públicos y founder_slots_left().
```

### 2.12 Pruebas de RLS (pgTAP)

1. **Meta-test**: recorre el catálogo y falla si alguna tabla de `public` no tiene RLS activado.
2. **Meta-test cruzado**: para cada tabla con columna `client_id`, con datos de clientes A y B, actuando como A → `0` filas de B en select/update/delete, e insert con `client_id = B` rechazado.
3. Tests específicos: el cliente no puede cambiar su `status`/`plan`; anon solo inserta en las tablas públicas; admin sin scope `health` no ve `health_screenings`; Storage: A no puede firmar rutas de B.

---

## 3. Pantallas

### 3.1 Públicas
| Ruta | Pantalla |
|---|---|
| `/empezar` | Planes (Rookie, All In, MVP con contador de plazas fundador, Peak) + campo de código + precio final |
| `/empezar/peak` | Solicitud Peak (formulario → `leads`) |
| `/empezar/cuenta` | Registro (email/Google) + consentimientos |
| `/empezar/confirmando` | Espera del webhook ("Confirmando tu pago… ¿Y tú, quieres ganar?") con polling |
| `/login`, `/recuperar`, `/auth/callback`, `/invitacion` | Acceso |
| `/tutor/[token]` | Confirmación del tutor legal |
| `/hyrox` (+ `/hyrox/gracias`) | Lista de espera HYROX |
| `/embed/hyrox-banner` | Banner embebible (iframe o snippet) para la web |
| `/legal/privacidad`, `/legal/aviso-legal`, `/legal/terminos`, `/legal/cookies` | Borradores editables + banner de cookies |

### 3.2 App del cliente (barra inferior: **Hoy · Entreno · Comida · Progreso · Más**)
| Ruta | Pantalla |
|---|---|
| `/onboarding` | Asistente: ficha → cuestionario de salud → tutor (si menor) → listo |
| `/hoy` | Sesión de hoy, menú de hoy, check-in pendiente, próxima videollamada, racha, avisos, WhatsApp |
| `/entreno` | Bloque y semana actuales, sesiones |
| `/entreno/sesion/[id]` | Detalle + modo entrenar (vídeos, temporizador de descanso, cronómetro WOD/HYROX/running, registro por serie, offline) |
| `/entreno/sesion/[id]/resumen` | Resumen, récords, racha, medalla |
| `/entreno/historial`, `/entreno/historial/[logId]`, `/entreno/records` | Historial y récords |
| `/comida` | Menú semanal (7 días, macros por comida/día/semana) |
| `/comida/[fecha]` | Día: comidas, notas, "pedir cambio" |
| `/comida/compra` | Lista de la compra (secciones, marcar, personas, coste vs presupuesto) |
| `/comida/suplementos` | Recomendaciones + enlaces HSN con aviso de afiliado |
| `/progreso` | Métricas activas, gráficas, objetivos |
| `/progreso/fotos` | Galería y comparador lado a lado |
| `/progreso/checkin`, `/progreso/checkins` | Rellenar check-in / histórico con respuestas de Jaime |
| `/agenda`, `/agenda/reservar` | Videollamadas, créditos, reservar/cancelar/reprogramar |
| `/chat` | Chat con Jaime |
| `/retos`, `/retos/[id]`, `/medallas` | Retos y colección de medallas |
| `/perfil` | Datos, ficha de onboarding editable, campos personalizados editables |
| `/perfil/plan` | Plan, funciones, mejorar plan, pagos, Customer Portal, código Squad, carnet de estudiante |
| `/perfil/notificaciones`, `/perfil/apariencia` | Preferencias, tema claro/oscuro |
| `/perfil/privacidad` | Consentimientos, descargar mis datos, eliminar cuenta |

### 3.3 Panel (Jaime/Elena) — lateral en escritorio, barra inferior en móvil
| Ruta | Pantalla |
|---|---|
| `/panel` | Dashboard (§5.1 del brief) |
| `/panel/pendientes` | Bandeja única: check-ins por revisar, cambios de menú, carnets, solicitudes Peak, cambios de ficha |
| `/panel/clientes`, `/panel/clientes/nuevo` | Lista con filtros/búsqueda; alta manual + invitación |
| `/panel/clientes/[id]/{resumen,ficha,entreno,nutricion,progreso,checkins,pagos,agenda,chat,notas,documentos}` | Las 11 pestañas |
| `/panel/clientes/[id]/entreno/bloques/[blockId]` | Editor de bloque (semanas, sesiones, partes, ítems; duplicar) |
| `/panel/clientes/[id]/nutricion/menus/[planId]` | Editor de menú semanal |
| `/panel/mensajes` | Bandeja de chats |
| `/panel/agenda`, `/panel/agenda/disponibilidad` | Calendario semana/mes; disponibilidad, excepciones, tipos de cita |
| `/panel/ejercicios` (+ `/[id]`, `/importar`) | Biblioteca de ejercicios |
| `/panel/plantillas/entreno` (+ `/[id]`) | Plantillas de entreno |
| `/panel/importar` | Asistente de importación Excel (subir → mapear columnas → validar fila a fila → importar) |
| `/panel/alimentos` (+ `/importar`) | Base de alimentos + búsqueda Open Food Facts |
| `/panel/plantillas/menus` (+ `/[id]`) | Plantillas de menú |
| `/panel/seguimiento/metricas`, `/campos`, `/checkins` | Catálogo de métricas, campos personalizados, plantillas de check-in |
| `/panel/retos`, `/panel/medallas` | Gamificación |
| `/panel/pagos` | Todos los cobros, registrar pago manual, vencidos |
| `/panel/negocio` | KPIs, gráficas, CSV |
| `/panel/planes`, `/panel/descuentos`, `/panel/squad` | Planes + matriz de funciones, descuentos, referidos |
| `/panel/hyrox` | Lista de espera, eventos, conversión del banner, email masivo |
| `/panel/suplementos` | Enlaces de afiliado y clics |
| `/panel/ajustes/*` | Marca, WhatsApp, emails, notificaciones, Google Calendar, legal, retención, equipo y permisos |
| `/panel/auditoria` | Registro de auditoría (owner) |

---

## 4. Fases

Propongo **partir la Fase 1** porque es la más grande y la que más decisiones necesita:

| Fase | Contenido | Entregable desplegable |
|---|---|---|
| **1a** | Scaffold, tokens de marca, i18n, PWA base, Supabase local, migración de identidad + RLS + tests RLS, auth (email/magic link/Google), roles, layouts cliente/panel, CI, Vercel preview, seeds base | Login funcionando con owner/admin/cliente y RLS probada |
| **1b** | Planes, funciones por plan, descuentos (motor + Stripe), `/empezar` + Checkout + webhooks, modo manual + renovaciones + recordatorios, plazas fundador, migrar a Stripe, onboarding + cuestionario de salud + tutor, `profile_changes` + avisos, lista y panel de clientes (pestañas Resumen/Ficha/Pagos/Notas), app del cliente base, email de bienvenida | Alta + pago de punta a punta en preview |
| 2 | Ejercicios, bloques/semanas/sesiones (4 modalidades), plantillas, importador Excel, registro de entrenos offline, récords | |
| 3 | Métricas, progreso, fotos privadas, check-ins, gráficas, adherencia | |
| 4 | Alimentos + OFF, menú semanal, notas, cambios, lista de la compra, HSN | |
| 5 | Agenda, créditos, Google Calendar/Meet | |
| 6 | Chat, WhatsApp, push y email completos, resumen diario | |
| 7 | Retos, rachas, medallas, Squad, lista HYROX | |
| 8 | Negocio, RGPD completo (export/borrado/retención), pulido de marca, E2E completos, producción | |
| 9 | Capacitor + App Store, Garmin/Strava/Apple Salud, migración masiva a Stripe | |

Cada fase termina con: qué se ha hecho, cómo probarlo (local + preview), qué queda y qué decisiones necesito.

**Seeds**: 1 owner, 1 admin, 6 clientes ficticios (Rookie, All In ×2, MVP fundador, MVP, Peak; mezcla de gym/funcional/running/HYROX; Stripe y manual; uno con pago vencido) con historial generado de forma determinista. **Alimentos en seeds**: no invento valores; o bien se cargan productos reales de Open Food Facts por código de barras (marcados *sin verificar*, con atribución ODbL), o los de demo van marcados `DEMO – valores ficticios` y nunca se cargan en producción. **[DEFECTO]** la primera.

---

## 5. Valores por defecto que tomaré (cambiables en el panel)

| Tema | Defecto |
|---|---|
| Periodo de gracia | 5 días en `past_due` con acceso; después acceso solo lectura a su historial y pantalla de pago |
| Recordatorios de pago manual | −3 días, día D, +3 días |
| Check-in | Semanal, domingo; recordatorio domingo 20:00 y lunes 12:00 |
| Créditos MVP | 2 al mes, se conceden en cada renovación, **no** se acumulan; los extra comprados caducan a los 3 meses |
| Reservas | Antelación mínima 24 h; cancelar/reprogramar sin perder crédito hasta 12 h antes |
| Descuentos | No acumulables salvo que se marquen; estudiante + squad sí acumulables |
| Referido "cualificado" | Cuando el amigo paga su primera cuota (y pasan 14 días sin devolución) |
| Racha de entrenos | Semanas consecutivas con ≥ 80 % de las sesiones planificadas hechas (no diaria: los días de descanso no rompen nada) |
| Racha de check-ins | Check-ins consecutivos entregados a tiempo |
| Cuestionario de salud | Si hay alguna respuesta "sí": no bloquea, recomienda consulta médica y avisa a Jaime |
| Presupuesto de comida | Semanal (€/semana) |
| Alergias | Selector con los 14 alérgenos UE + texto libre (mismo campo del brief, estructurado para poder avisar de choques) |
| Admin (Elena) | Todos los permisos |
| Zona horaria | Europe/Madrid (configurable por usuario) |
| Vídeos de YouTube | `youtube-nocookie.com` (evita cookies de terceros sin consentimiento) |

---

## 6. Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | **Apple y compras dentro de la app.** La norma 3.1.1 obliga a usar compras de Apple para contenido digital; la 3.1.3(d) permite cobrar fuera los servicios en tiempo real *persona a persona* (cita "fitness training"), pero los planes incluyen contenido asíncrono (rutinas, menús). | En la app iOS: **sin precios, sin botones de compra y sin enlaces a pagar**; solo login de clientes que ya han contratado en la web. Pagos 100 % en la web. Revisar normas vigentes en la Fase 9 (cambian a menudo, y hay reglas distintas en EE. UU./UE). |
| R2 | **Costes de infraestructura**: Vercel Hobby **no permite uso comercial** → Vercel Pro (~20 $/mes). Supabase Free pausa el proyecto tras 7 días sin uso y no incluye backups → Supabase Pro (~25 $/mes) para producción. Resend gratis: 3.000 emails/mes y 100/día (suficiente al principio). Stripe: ~1,5 % + 0,25 € por tarjeta UE + ~0,7 % de Billing en suscripciones. | Desarrollo y previews en planes gratuitos; contratar Pro antes de producción. Verificar tarifas vigentes. |
| R3 | **Datos de salud (art. 9 RGPD)**: tratamiento de categorías especiales a cierta escala. | Consentimiento explícito, región UE, DPAs con Supabase/Vercel/Stripe/Resend/Google, registro de actividades, valorar una **EIPD**. Revisión por profesional (lo dejo como checklist en el README). |
| R4 | **Google Calendar**: si Jaime usa una cuenta @gmail (no Workspace), hay que usar OAuth con su cuenta; con la app de Google Cloud en modo "testing" el token caduca a los 7 días. | Pasar la app OAuth a "producción" (para uso propio basta, sin verificación completa, con aviso de app no verificada) y guardar el token en Vault. Con Workspace sería más sencillo. |
| R5 | **Stripe solo admite un descuento en Checkout**. | Motor propio + combinación descrita en §1.7. Tests unitarios del cálculo y del "cuadre" con Stripe. |
| R6 | **Carrera en plazas fundador** (dos pagos simultáneos por la última plaza). | Reserva temporal con bloqueo en BD; liberación al expirar el Checkout. |
| R7 | **Cambios de precio** con clientes ya suscritos. | Decidir política (mantener precio antiguo vs. migrar con aviso). |
| R8 | **Open Food Facts**: datos colaborativos (pueden estar mal), límites de uso (≈10 búsquedas/min) y licencia ODbL (exige atribución). | Proxy en servidor con caché, todo lo importado entra como *sin verificar*, atribución visible. |
| R9 | **Facturación**: la plataforma no emite facturas fiscales. El sistema VERI*FACTU será obligatorio para software de facturación (calendario vigente a mi conocimiento: 2027). | Facturar con una herramienta externa homologada o con vuestra gestoría; `invoices_manual` solo archiva. Confirmar con gestoría IVA (¿precios con IVA incluido?) y quién factura. |
| R10 | **Push en iOS** solo con la PWA instalada en pantalla de inicio. | Email como canal de respaldo + guía "instala la app" en el onboarding. |
| R11 | **Offline**: conflictos si se registra una sesión en dos dispositivos. | `client_uuid` idempotente por registro; última escritura gana por serie; aviso si hay duplicado. |
| R12 | **Vídeos pesados** (análisis de técnica): límite de 50 MB por archivo en Supabase Free y coste de almacenamiento. | Subida reanudable (TUS), límite de tamaño/duración configurable, recomendación de recorte en móvil; retención configurable. |
| R13 | **Integraciones (Fase 9)**: Garmin requiere aprobación en su programa de desarrolladores; Apple Salud requiere app nativa (solo vía Capacitor); Strava restringió en 2024 el uso de datos por terceros (los casos de coaching se aclararon como permitidos — verificar). | Modelo ya preparado; solicitar acceso a Garmin con tiempo. |
| R14 | **Menores**: en España, por debajo de 14 años el tratamiento de datos requiere consentimiento de los padres (LOPDGDD art. 7); por debajo de 18, la contratación también. | Bloqueo de acceso hasta confirmación del tutor por email; el pago lo hace el tutor. |
| R15 | **Alcance**: el brief equivale a varios meses de trabajo. | Fases desplegables, Fase 1 partida, y priorizar lo que hoy hacéis en Excel. |

---

## 7. Dudas que necesito resolver

**Bloquean la Fase 1b (pagos):**
1. **Peak 149 / 179 / 209 "pack"**: ¿son tres niveles mensuales distintos (qué diferencia a cada uno), packs de varios meses, o un precio que Jaime elige por cliente? ¿Se cobra por Stripe con enlace a medida, manual, o ambos?
2. **Precio fundador (59,90 €)**: ¿es para siempre mientras no se dé de baja, o durante X meses? Si se da de baja y vuelve, ¿lo pierde? ¿Las 6 plazas son solo de MVP?
3. **Squad**: ¿cuánto descuento (porcentaje o importe) recibe cada uno? ¿Cuánto dura? Si traigo a 3 amigos, ¿se acumula (con tope)? ¿Aplica a todos los planes?
4. **Estudiante**: ¿cuánto descuento? ¿Se revalida cada curso (caducidad del carnet)?
5. **Acumulación**: ¿qué descuentos se pueden sumar entre sí? (Mi defecto: estudiante + squad sí; fundador con nada.)
6. **Cambios de precio**: ¿los clientes actuales mantienen su precio (grandfathering) o se les migra con aviso?
7. **Fiscal**: ¿precios con IVA incluido? ¿Quién factura (Jaime autónomo, sociedad…)? ¿A nombre de quién va la cuenta de Stripe?
8. **Sesión extra de 1 h**: precio, y si se puede comprar desde Rookie/All In o solo MVP/Peak.
9. **Cobro manual**: ¿siempre mensual o a veces pagan varios meses de golpe (trimestre)? ¿Fecha de renovación = día de alta, o día fijo de mes para todos?
10. **Qué pasa al acabar la gracia**: ¿acceso bloqueado total o solo lectura? (Mi defecto: solo lectura + pantalla de pago.)

**Necesarias antes de la Fase 1a/1b:**
11. **Matriz de funciones por plan**: confirmar la propuesta del brief (p. ej. ¿Rookie con 1 check-in *mensual*?, ¿All In con chat?).
12. **Clientes actuales**: ¿cuántos hay y cómo los pasamos? Me ayudaría **un Excel/Sheet real anonimizado** de rutinas, menús y seguimiento para diseñar el importador y los seeds (puedo leerlo desde Google Drive/Sheets si me pasas el enlace).
13. **Cuentas**: ¿quién crea/posee las cuentas de Supabase, Vercel, Stripe, Resend y Google Cloud (recomiendo un email de empresa común, no personal)? ¿Contratáis Vercel Pro y Supabase Pro para producción?
14. **Google de Jaime**: ¿cuenta @gmail o Google Workspace?
15. **Web actual**: ¿en qué plataforma está www.trainwithjaime.es (WordPress, Wix, Squarespace…) y dónde se gestiona el DNS? (Para el CNAME y para incrustar el banner HYROX.)
16. **Remitente de emails**: ¿`hola@…`? ¿con nombre "Jaime de TWJ"?
17. **Repo**: confirmo que trabajo en `elenaturiel/twj-platform`, rama principal `main` (renombro la local `master`), y una rama + PR por fase. ¿Os parece?

**Pueden esperar (las dejo como TODO/configuración):** hex de azules y tipografías, logo SVG, WhatsApp, código HSN, preguntas del check-in, textos legales definitivos, pesos HYROX por categoría.
