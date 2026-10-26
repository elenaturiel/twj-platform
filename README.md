# TWJ App — Train with Jaime

Plataforma de gestión y seguimiento de clientes de **Train with Jaime** (`app.trainwithjaime.es`).

> Plan completo: [`docs/PLAN.md`](docs/PLAN.md) · Decisiones técnicas: [`docs/DECISIONES.md`](docs/DECISIONES.md)

## Stack

Next.js 16 (App Router) · TypeScript estricto · Tailwind CSS v4 + shadcn/ui · Supabase (Postgres + RLS, Auth, Storage, Realtime) · Stripe · Resend · next-intl (es-ES) · Vitest · Playwright · pgTAP.

## Puesta en marcha en local

Requisitos: Node 22, pnpm 10, Docker.

```bash
pnpm install
pnpm db:start          # arranca Supabase en Docker e imprime las claves locales
cp .env.example .env.local
# rellena NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY y SUPABASE_SECRET_KEY con lo que imprime db:start
pnpm db:reset          # aplica supabase/migrations
pnpm db:seed           # 1 owner, 1 admin, 6 clientes ficticios
pnpm dev               # http://localhost:3000
```

Usuarios de demo (contraseña `twj-demo-1234`):

| Email                | Rol                        | Qué ver                                  |
| -------------------- | -------------------------- | ---------------------------------------- |
| `jaime@twj.local`    | owner                      | Panel completo                           |
| `elena@twj.local`    | admin                      | Panel (todos los permisos)               |
| `cliente1@twj.local` | Lucía · Rookie             | Pagado, sin ficha → onboarding           |
| `cliente2@twj.local` | Pablo · All In (manual)    | App del cliente                          |
| `cliente3@twj.local` | Marta · All In             | Pago vencido dentro de la gracia (aviso) |
| `cliente4@twj.local` | Diego · MVP fundador       | Entrenos en directo                      |
| `cliente5@twj.local` | Irene · MVP anual (manual) |                                          |
| `cliente6@twj.local` | Álvaro · Peak              |                                          |

Emails locales (magic link, recuperar contraseña): Mailpit en http://127.0.0.1:54324. Studio de Supabase: http://127.0.0.1:54323.

## Comandos

| Comando                                              | Qué hace                                                  |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `pnpm lint` / `pnpm typecheck` / `pnpm format:check` | Calidad                                                   |
| `pnpm test`                                          | Tests unitarios (lógica de dominio)                       |
| `pnpm test:rls`                                      | Tests de RLS con pgTAP (necesita `pnpm db:start`)         |
| `pnpm test:e2e`                                      | Tests E2E con Playwright                                  |
| `pnpm db:types`                                      | Regenera `src/types/database.ts` tras cambiar migraciones |

## Estructura

```
src/app/            rutas: (public) login/empezar/legal · (client) app del cliente · panel/ staff
src/domain/         lógica de negocio pura + tests (acceso, cobros, descuentos…)
src/features/       componentes y server actions por dominio
src/lib/            supabase (server/browser/admin/proxy), auth (DAL), env, utilidades
src/styles/         tokens.css (colores de marca) y fonts.ts (tipografías)
src/i18n/           textos en messages/es.json
supabase/           migrations/, tests/ (pgTAP), seed/
```

## Marca

Todos los colores están en `src/styles/tokens.css` y las tipografías en `src/styles/fonts.ts`. Busca `TODO(marca)` para poner los hex, las fuentes y el logo definitivos.

## Estado

- **Fase 1a** ✅: proyecto, tokens, i18n, PWA base, auth (email/contraseña, magic link, Google), roles, RLS + tests, layouts de cliente y panel, CI, semillas.
- **Fase 1b** 🚧: planes, descuentos, alta + pago (Stripe y manual), onboarding, panel de clientes.

(La guía de despliegue completa —Vercel, dominio, Stripe, Resend, Google— se añade al final de la Fase 1b.)
