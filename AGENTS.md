<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Convenciones del proyecto TWJ

- UI y textos en español (es-ES); los textos van en `src/i18n/messages/es.json`, nunca sueltos si se reutilizan.
- Colores solo con tokens semánticos (`bg-primary`, `text-accent`…). Los hex viven en `src/styles/tokens.css`.
- Datos: usa siempre `createClient()` de `@/lib/supabase/server` (respeta RLS). `createAdminClient()` solo en webhooks/crons.
- Toda tabla nueva: RLS activado + grants explícitos + test en `supabase/tests`. Después, `pnpm db:types`.
- Lógica de negocio en `src/domain/` como funciones puras con tests de Vitest.
- No inventar datos nutricionales, textos legales, claves ni precios de Peak.
