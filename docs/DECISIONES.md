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
