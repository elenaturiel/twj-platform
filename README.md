# TWJ App — Train with Jaime

Plataforma de gestión y seguimiento de clientes de **Train with Jaime** (`app.trainwithjaime.es`).

> Plan completo: [`docs/PLAN.md`](docs/PLAN.md) · Decisiones técnicas: [`docs/DECISIONES.md`](docs/DECISIONES.md)

## Stack

Next.js 16 (App Router) · TypeScript estricto · Tailwind CSS v4 + shadcn/ui · Supabase (Postgres + RLS, Auth, Storage, Realtime) · Stripe · Resend + React Email · Web Push · next-intl (es-ES) · Vitest · Playwright · pgTAP.

---

## 1. Puesta en marcha en local

Requisitos: Node 22, pnpm 10 y Docker en marcha.

```bash
pnpm install
pnpm db:start            # arranca Supabase en Docker e imprime las claves locales
cp .env.example .env.local
#   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY y SUPABASE_SECRET_KEY → las que imprime db:start
#   PAYMENTS_MOCK=1      → simulador de pagos (sin Stripe)
#   CRON_SECRET=lo-que-quieras
pnpm db:reset            # aplica supabase/migrations
pnpm db:seed             # 1 owner, 1 admin, 6 clientes ficticios
pnpm dev                 # http://localhost:3000
```

### Usuarios de demo (contraseña `twj-demo-1234`)

| Email                | Quién                           | Qué probar                                      |
| -------------------- | ------------------------------- | ----------------------------------------------- |
| `jaime@twj.local`    | owner                           | Panel completo                                  |
| `elena@twj.local`    | admin (todos los permisos)      | Panel                                           |
| `cliente1@twj.local` | Lucía · Rookie                  | Pagado sin ficha → onboarding                   |
| `cliente2@twj.local` | Pablo · All In · manual         | App del cliente, perfil, «Mi plan»              |
| `cliente3@twj.local` | Marta · All In                  | Pago vencido dentro de la gracia (aviso arriba) |
| `cliente4@twj.local` | Diego · MVP fundador            | Entrenos en directo destacados                  |
| `cliente5@twj.local` | Irene · MVP anual · manual      |                                                 |
| `cliente6@twj.local` | Álvaro · Peak (importe pactado) |                                                 |

- Emails de Supabase Auth en local (magic link, invitaciones, recuperar contraseña): **Mailpit**, en http://127.0.0.1:54324.
- Los emails de la app (bienvenida, avisos) **no se envían** sin `RESEND_API_KEY`: salen en la consola como `[email:skip]`.
- Studio de Supabase: http://127.0.0.1:54323.

### Qué probar (todas las fases)

Entra con los usuarios de demo. Cliente con todo: `cliente4` (Diego, MVP). Staff: `jaime`.

1. **Alta y pago**: `/empezar` → elige plan → cuenta → simulador de pago → ficha → `/hoy`. Sin pagar no hay acceso.
2. **Cobro manual y planes**: Panel → Clientes → Nuevo cliente (cobro manual). `/panel/planes` para precios, funciones y descuentos.
3. **Entreno**: `cliente4` → Entreno → sesión de hoy → registra series (funciona sin conexión) → Historial y Récords. Jaime: ficha del cliente → Entreno (editor de bloques) y Biblioteca → Importar Excel.
4. **Seguimiento**: Progreso (métricas, fotos privadas, check-in). Jaime: Seguimiento y Pendientes → responder check-in (texto y nota de voz).
5. **Comida**: menú de la semana, «Cambiar», notas del día, lista de la compra por personas, suplementos. Jaime: ficha → Nutrición y Biblioteca → Alimentos (buscar en Open Food Facts).
6. **Agenda**: `/agenda` → Reservar (salta al primer día con huecos) → cambiar hora / cancelar (devuelve el crédito hasta 12 h antes) → comprar sesión extra (simulador). Jaime: Agenda (semana, resumen con 3 objetivos) y Disponibilidad.
7. **Chat**: icono de mensaje arriba (cliente) ↔ Panel → Mensajes. Llega en directo; fotos, vídeo y notas de voz.
8. **Avisos**: campana; Perfil → Avisos (email/push por tipo). Jaime: Ajustes → Mis avisos y Plantillas de email.
9. **Retos y medallas**: `/retos` (apuntarse, clasificación), `/medallas`, racha en `/hoy`, `/squad`. Jaime: Retos. Para recalcular a mano: cron `engagement`.
10. **HYROX**: `/hyrox` (3 pasos) → Panel → HYROX (embudo, CSV, email a la lista).
11. **Negocio y RGPD**: Panel → Negocio (MRR, CSV). Cliente: Más → Privacidad y datos (descargar, pedir borrado). Jaime: Ajustes → Privacidad (RGPD), Equipo y permisos, Textos legales.
12. **Crons a mano**: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/<job>` con `billing`, `checkins`, `agenda`, `engagement`, `notifications`, `digest`, `hyrox`, `privacy`.

## 2. Comandos

| Comando                                              | Qué hace                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `pnpm lint` · `pnpm typecheck` · `pnpm format:check` | Calidad de código                                                                          |
| `pnpm test`                                          | Tests unitarios de la lógica de negocio (precios, descuentos, renovaciones, acceso, edad…) |
| `pnpm test:rls`                                      | Tests de RLS con pgTAP (necesita `pnpm db:start`)                                          |
| `pnpm test:e2e`                                      | E2E con Playwright (necesita BD con semillas y `PAYMENTS_MOCK=1`)                          |
| `pnpm db:types`                                      | Regenera `src/types/database.ts` después de tocar migraciones                              |
| `pnpm email:dev`                                     | Vista previa de las plantillas de email                                                    |

La CI (GitHub Actions) ejecuta formato, lint, tipos, unitarios, migraciones + RLS, build y E2E en cada PR.

## 3. Estructura

```
src/app/            (public) login, empezar, legal, offline · (client) app del cliente · panel/ staff · api/ webhooks y crons
src/domain/         lógica pura con tests (billing, access, onboarding)
src/features/       componentes + server actions por dominio (auth, billing, onboarding, clients, config, legal)
src/lib/            supabase (server/browser/admin/proxy), auth (DAL), email, notifications, payments, env
src/styles/         tokens.css (colores de marca) y fonts.ts (tipografías)
src/i18n/           textos en messages/es.json
emails/             plantillas React Email
supabase/           migrations/, tests/ (pgTAP), seed/
tests/e2e/          Playwright
```

---

## 4. Despliegue: qué configurar y dónde

### 4.1 Supabase (producción)

1. Crea el proyecto en una **región de la UE** (Frankfurt o París). Para producción hace falta el **plan Pro**: el plan Free pausa el proyecto si no se usa y no incluye backups.
2. Aplica las migraciones: `pnpm exec supabase link --project-ref <ref>` y después `pnpm exec supabase db push`.
3. **Auth → URL Configuration**: Site URL `https://app.trainwithjaime.es`. En Redirect URLs añade `https://app.trainwithjaime.es/**` y el patrón de previews de Vercel (`https://*-<equipo>.vercel.app/**`).
4. **Auth → Providers**:
   - Email: activado, con «Confirm email» activado.
   - Google: ver §4.5.
5. **Auth → SMTP**: usa Resend (host `smtp.resend.com`, usuario `resend`, contraseña = API key). Así los emails de acceso no dependen del límite del SMTP de Supabase.
6. **Auth → Email Templates**: tradúcelos al español con el tono de TWJ. La invitación debe apuntar a `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/auth/nueva-contrasena`.
7. **Database → Extensions**: activa `pg_cron` y `pg_net` (para las tareas programadas, §4.7).
8. Copia las claves en Vercel (Settings → API Keys): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`. La clave secreta **nunca** debe llevar el prefijo `NEXT_PUBLIC_`.

### 4.2 Stripe

1. Trabaja en **modo test** hasta el OK final.
2. **No hace falta crear productos a mano**: la app crea el Product y los Price (IVA incluido, `tax_behavior=inclusive`) la primera vez que alguien paga un plan.
3. **Developers → Webhooks → Add endpoint**:
   - URL: `https://app.trainwithjaime.es/api/webhooks/stripe`
   - Eventos: `checkout.session.completed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.
   - Copia el _signing secret_ en `STRIPE_WEBHOOK_SECRET`.
4. **Settings → Billing → Customer portal**: actívalo. Permite actualizar el método de pago, ver facturas y cancelar al final del periodo. No actives el cambio de plan desde el portal: los cambios de plan van por la app.
5. Variables: `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`. En producción **no** definas `PAYMENTS_MOCK`: el simulador además se niega a funcionar si `VERCEL_ENV=production`.
6. Para probar el webhook en local: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` y usa el `whsec_…` que imprime.

### 4.3 Resend (emails)

1. Añade y verifica un **subdominio de envío**, p. ej. `mail.trainwithjaime.es`. Resend te da los registros SPF/DKIM (TXT/MX) **solo de ese subdominio**, así no se toca el correo actual del dominio raíz.
2. Variables: `RESEND_API_KEY` y `EMAIL_FROM="Train with Jaime <hola@mail.trainwithjaime.es>"`.
3. Los textos de los emails se editan en la tabla `message_templates` (editor en el panel en la Fase 6).

### 4.4 Dominio `app.trainwithjaime.es` (sin tocar la web actual)

1. Vercel → Proyecto → Settings → Domains → añade `app.trainwithjaime.es`.
2. En el DNS de `trainwithjaime.es`, crea **un único registro**: `CNAME` · nombre `app` · valor el que te indique Vercel (p. ej. `cname.vercel-dns.com`). No toques los registros `A`/`AAAA` del dominio raíz, `www` ni `MX`.
3. Si hay un registro `CAA`, debe permitir `letsencrypt.org`.
4. Como la web actual ya está en Vercel, si el dominio se gestiona desde el mismo equipo de Vercel basta con añadir el subdominio al proyecto nuevo.

### 4.5 Google (login, y Calendar/Meet para la agenda)

1. Google Cloud Console → crea un proyecto → **OAuth consent screen** (External, en español, con logo y dominio `trainwithjaime.es`). Activa la **Google Calendar API**.
2. **Credentials → OAuth client ID** (Web). «Authorized redirect URIs»:
   - `https://<ref>.supabase.co/auth/v1/callback` (login con Google)
   - `https://app.trainwithjaime.es/api/google/callback` (Calendar/Meet de Jaime)
3. Login: pega el Client ID y el Secret en Supabase → Auth → Providers → Google.
4. Agenda: en Vercel, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (los mismos). Luego Jaime entra en Panel → Agenda → Disponibilidad → «Conectar Google Calendar». El token se guarda cifrado en Supabase Vault.
5. Como Jaime usa una cuenta @gmail, la app OAuth tiene que estar **en producción**; en modo «testing» el token caduca a los 7 días. Sin Google, la agenda funciona igual con el enlace fijo de Meet que se pone en Disponibilidad.

### 4.6 Web Push (Fase 6)

`npx web-push generate-vapid-keys` → `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT=mailto:…`. En iOS, el push solo funciona con la PWA añadida a la pantalla de inicio (iOS 16.4 o superior).

### 4.7 Tareas programadas (pg_cron → `/api/cron/*`)

En el SQL editor de Supabase, **una vez por entorno**:

```sql
select vault.create_secret('https://app.trainwithjaime.es', 'app_url');
select vault.create_secret('<el mismo CRON_SECRET que en Vercel>', 'cron_secret');

create or replace function public.call_cron(job text) returns void
language sql security definer set search_path = '' as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_url') || '/api/cron/' || job,
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'))
  );
$$;
revoke all on function public.call_cron(text) from public, anon, authenticated;

select cron.schedule('twj-notifications', '* * * * *',  $$ select public.call_cron('notifications') $$); -- cola de email/push
select cron.schedule('twj-billing',       '0 7 * * *',  $$ select public.call_cron('billing') $$);       -- 08:00/09:00 Madrid
select cron.schedule('twj-digest',        '0 19 * * *', $$ select public.call_cron('digest') $$);        -- resumen diario
select cron.schedule('twj-checkins',      '30 6 * * *', $$ select public.call_cron('checkins') $$);      -- check-ins del día
select cron.schedule('twj-agenda',        '*/15 * * * *', $$ select public.call_cron('agenda') $$);     -- recordatorios 24 h / 1 h y créditos del mes
select cron.schedule('twj-engagement',    '15 3 * * *', $$ select public.call_cron('engagement') $$);   -- rachas, retos y medallas
select cron.schedule('twj-hyrox',         '* * * * *',  $$ select public.call_cron('hyrox') $$);         -- emails masivos HYROX por tandas
select cron.schedule('twj-privacy',       '0 4 * * 1',  $$ select public.call_cron('privacy') $$);       -- anonimiza bajas con plazo vencido
```

Alternativa: Vercel Cron. En el plan Hobby solo permite tareas diarias, así que la cola de notificaciones necesita pg_cron o Vercel Pro.

### 4.7 bis · Formulario HYROX de la web actual

La web (www.trainwithjaime.es/hyrox) ya manda sus datos a su propio `/api/hyrox`. Para que lleguen al panel de la app basta con **cambiar la URL del `fetch`** a `https://app.trainwithjaime.es/api/public/hyrox-waitlist` (mismo JSON: `action`, `id`, `ub`, `nivel`, `cuando`, `email`, `consentimiento`, `website`, `utm_*`). Otra opción, sin tocar el formulario: que el `/api/hyrox` de la web reenvíe el mismo cuerpo a esa URL. Los orígenes permitidos (CORS) están en el ajuste `hyrox.allowed_origins`. Banner para incrustar: `<iframe src="https://app.trainwithjaime.es/embed/hyrox-banner?ub=home" style="width:100%;height:180px;border:0"></iframe>`.

### 4.8 Variables de entorno (resumen)

Ver [`.env.example`](.env.example). En Vercel, configura las de **Production** y las de **Preview**. Las previews pueden apuntar a un proyecto de Supabase de staging y a Stripe en modo test.

---

## 5. Checklist de salida a producción

- [ ] Vercel **Pro**: el plan Hobby no permite uso comercial.
- [ ] Supabase **Pro** en región UE, con backups diarios activos.
- [ ] Migraciones aplicadas (`supabase db push`) y `pnpm test:rls` en verde contra staging.
- [ ] Usuarios owner/admin creados: regístrate y luego `update profiles set role='owner' where email='…'`. Permisos de Elena en `staff_permissions`.
- [ ] Stripe en **modo live**: claves, webhook live, Customer Portal y datos fiscales de la cuenta.
- [ ] Resend: dominio verificado, SMTP de Supabase configurado y plantillas de Auth traducidas.
- [ ] Google OAuth publicado (en producción).
- [ ] DNS: `CNAME app` creado y certificado emitido.
- [ ] pg_cron programado (§4.7) y `CRON_SECRET` fuerte.
- [ ] `PAYMENTS_MOCK` **sin definir** en producción.
- [ ] **Textos legales** (privacidad, aviso legal, términos, cookies, consentimiento de salud y del tutor) redactados y **revisados por un profesional**, y publicados en `legal_documents`.
- [ ] Cuestionario de salud verificado contra el **PAR-Q+ oficial en español** (y su aviso de copyright).
- [ ] Registro de actividades de tratamiento y valoración de **EIPD** (hay datos de salud).
- [ ] DPA aceptados con Supabase, Vercel, Stripe, Resend y Google.
- [ ] Marca definitiva: hex, tipografías, logo SVG e iconos de la PWA (`TODO(marca)`).
- [ ] Confirmar con la gestoría: IVA incluido, quién factura y si hay que adaptarse a **VERI\*FACTU** (2027).
- [ ] Google Calendar conectado (Disponibilidad) o enlace fijo de Meet puesto; horario semanal revisado.
- [ ] VAPID (push) generadas y puestas en Vercel.
- [ ] Formulario HYROX de la web apuntando al endpoint de la app (§4.7 bis).
- [ ] Borrar los datos de demo (usuarios `@twj.local`, retos y lista HYROX «demo») si se reutiliza el proyecto de staging.

## 6. App Store (Fase 9) — puntos a vigilar desde ya

- **Pagos fuera de la app iOS.** La norma 3.1.1 de Apple obliga a usar sus compras integradas para contenido digital. La 3.1.3(d) permite cobrar fuera los servicios **en tiempo real persona a persona** (menciona expresamente el entrenamiento personal), pero los planes también incluyen contenido asíncrono (rutinas, menús). Propuesta: en la app iOS **no aparecen precios, botones de compra ni enlaces para pagar**; solo entran clientes que ya han contratado en la web. Antes de enviarla a revisión hay que repasar las normas vigentes, porque cambian a menudo y son distintas en EE. UU. y en la UE.
- Lo que ya está preparado para Capacitor:
  - UI mobile-first con safe areas.
  - Rutas planas, útiles como deep links (`/hoy`, `/perfil/plan`, `/onboarding`…).
  - Sesión por cookies de `@supabase/ssr`, aislada en `src/lib/supabase/`.
  - Canal de notificaciones abstracto (`src/lib/notifications/channels.ts`), listo para añadir APNs/FCM.
  - Sin APIs exclusivas de escritorio.
- Apple Salud requiere la app nativa (HealthKit). Las tablas de integraciones están en el plan y se crean en su fase.

## 7. Estado por fases

| Fase                                                                                                                | Estado                                                |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1 · Base, auth, roles, RLS, alta + pago (Stripe/manual), planes, descuentos, onboarding, panel y app base           | ✅ (falta probar con claves reales de Stripe)         |
| 2 · Ejercicios, bloques/sesiones (gym, funcional, running, HYROX), importador Excel, registro de entrenos y récords | ✅ (falta probar con el Excel real de Jaime)          |
| 3 · Métricas, progreso, fotos privadas, check-ins, campos personalizados                                            | ✅ (preguntas del check-in: TODO de Jaime)            |
| 4 · Nutrición, alimentos (Open Food Facts), menú semanal, cambios, lista de la compra, suplementos                  | ✅ (código HSN: TODO)                                 |
| 5 · Agenda, créditos, videollamadas, Google Calendar/Meet, sesiones extra                                           | ✅ (falta conectar Google)                            |
| 6 · Chat en directo, avisos email/push, preferencias, plantillas                                                    | ✅ (faltan claves de Resend y VAPID)                  |
| 7 · Retos, rachas, medallas, squad, lista HYROX                                                                     | ✅ (falta cambiar la URL en la web)                   |
| 8 · Negocio, RGPD, equipo, textos legales, pulido                                                                   | ✅ (textos legales: los debe redactar un profesional) |
| 9 · Capacitor/App Store, Garmin/Strava/Apple Salud                                                                  | ⏳                                                    |
