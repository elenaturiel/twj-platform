# Decisiones técnicas

Registro corto de decisiones que se apartan del plan o que no son evidentes. Formato: fecha · decisión · motivo.

- **26-10-2026 · Next.js 16.4 con `cacheComponents: false`.** La app es casi entera por usuario y con sesión. Con Cache Components, cada lectura de cookies tiene que ir dentro de `<Suspense>` y planear qué se cachea, y aquí no ganamos nada con eso. Se puede activar más adelante en páginas públicas (`/empezar`, `/hyrox`).
- **26-10-2026 · `middleware` → `proxy.ts`.** En Next 16 se llama Proxy. Solo refresca la sesión de Supabase y redirige a `/login`. La autorización real está en la DAL (`src/lib/auth/dal.ts`) y en RLS.
- **26-10-2026 · El rol se lee de `profiles`, no del JWT.** El plan proponía un Custom Access Token Hook. Al final, `is_staff()`/`has_scope()` consultan `profiles` y `staff_permissions` (funciones `security definer`, llamadas como `(select fn())` en las políticas para que se evalúen una vez por consulta). Ventajas: un cambio de rol o de permisos se aplica al momento y no hay que configurar el hook en cada entorno. A nuestra escala, el coste es despreciable.
- **26-10-2026 · Privilegios explícitos.** Las migraciones revocan los privilegios por defecto de `anon`/`authenticated` y conceden tabla a tabla. RLS es la segunda barrera, no la única.
- **26-10-2026 · `client_intake` separada de `clients`.** El cliente puede editar su ficha, pero nunca su estado, plan ni método de cobro.
- **26-10-2026 · Los descuentos se suman (aditivos).** El −20 % anual se modela como un descuento más que se suma a squad/estudiante. El precio de lista anual es 12 × mensual.
- **26-10-2026 · Peak sin precio público.** `plans.price_cents` es `null` para Peak y la vista `public_plans` nunca expone precios de planes "a medida". El importe se pacta por cliente (`leads.quoted_price_cents`).
- **26-10-2026 · Service worker escrito a mano** (`public/sw.js`): página offline + push. Sin Serwist, para evitar dependencias de bundler. El modo sin conexión del registro de entrenos (Fase 2) irá en la app con IndexedDB.
- **26-10-2026 · Simulador de pagos (`PAYMENTS_MOCK=1`).** Sustituye a Stripe Checkout en local, CI y E2E, y usa el mismo código de activación que el webhook. Solo funciona si no hay `STRIPE_SECRET_KEY`, y nunca con `VERCEL_ENV=production`.
- **26-10-2026 · Descuentos en Stripe = cupones calculados por nuestro motor.** En Checkout va un cupón `once` por el total del primer cobro (Stripe solo admite uno). Tras el primer `invoice.paid`, cada descuento recurrente pasa a la suscripción como cupón propio con su duración (Stripe admite varios por suscripción).
- **26-10-2026 · Estudiante: descuento provisional.** Se aplica en el alta y el cliente sube el carné después. Si Jaime lo rechaza, el −10 % se quita en la próxima cuota. Validez hasta el 31 de agosto del curso.
- **26-10-2026 · Squad: el tramo se recalcula al entrar o salir alguien** y afecta a la **próxima** cuota de todos los miembros (no se rehacen cobros ya hechos).
- **26-10-2026 · Peak: alta desde el panel** («Nuevo cliente», plan Peak, importe pactado), cobro manual o enlace de Stripe. La solicitud pública no muestra precios.
- **26-10-2026 · Pago manual: el periodo sigue donde acabó el anterior** (pagar tarde no regala días ni pagar antes los quita). Si pasan más de 30 días desde el vencimiento, el periodo nuevo empieza el día del pago.
- **26-10-2026 · Avisos de cambios agrupados.** Un guardado del perfil genera una sola notificación con todos los campos («antes → después»). Rellenar la ficha por primera vez no cuenta como cambio.
- **26-10-2026 · Sin Resend no se envían emails** (`[email:skip]` en la consola). Las notificaciones in-app sí se guardan.
- **08-11-2026 · Alimentos de Open Food Facts siempre "sin verificar" y sin precio.** Si OFF no tiene un dato, queda vacío; Jaime lo verifica con la etiqueta. Los macros de menús con alimentos sin verificar se marcan en la UI.
- **08-11-2026 · El contenido de un menú en borrador no es visible para el cliente** (las políticas de días/comidas/alimentos comprueban que el menú esté publicado).
- **08-11-2026 · Créditos por "cubos" con caducidad.** Cada consumo/devolución copia la caducidad del cubo del que sale, así un crédito mensual caducado no resta del mes siguiente. Los mensuales caducan al acabar su ventana (también en cuotas anuales, que reciben créditos cada mes por cron); las sesiones extra, a los 3 meses.
- **08-11-2026 · Reglas de reserva en la BD** (`book_appointment`, `slot_is_open`) además de en `src/domain/agenda/slots.ts`; una exclusion constraint impide solapes aunque dos personas reserven a la vez. El Google de Jaime solo se consulta en el servidor de la app.
- **08-11-2026 · Google Calendar opcional.** Sin conexión, la cita usa el enlace fijo de ajustes o "Jaime te enviará el enlace". El refresh token se guarda en Supabase Vault y solo lo lee `service_role`.
- **08-11-2026 · Avisos de chat agrupados:** como mucho uno cada 10 minutos por conversación y persona. Realtime necesita `realtime.setAuth(token)` antes de suscribirse para que RLS deje pasar los mensajes.
- **09-11-2026 · Racha = semanas, no días** (≥ 80 % de lo planificado); semanas sin plan no rompen. Las rachas se guardan en `client_streaks` para que el squad las vea sin exponer entrenos.
- **09-11-2026 · La lista HYROX acepta el JSON del formulario actual de la web**, para que solo haya que cambiar la URL del `fetch`. Lo público entra por funciones `security definer` con límites; la tabla no es legible salvo por el equipo.
- **09-11-2026 · "Eliminar cuenta" = anonimizar.** Los pagos se conservan (obligación fiscal); el resto de tablas con `client_id` se borran de forma genérica (las tablas nuevas quedan cubiertas sin tocar código). El usuario de Auth se bloquea, no se borra, porque lo referencian pagos y mensajes.
- **09-11-2026 · Aviso de cookies informativo, sin consentimiento:** la app solo usa cookies técnicas. Si se añade analítica, habrá que pedir consentimiento antes de cargarla.
- **09-11-2026 · La animación de medalla solo sale en Hoy y Medallas**, nunca en mitad de una reserva o un entreno.
