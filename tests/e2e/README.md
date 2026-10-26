# E2E (Playwright)

Requisitos: `pnpm db:start && pnpm db:reset && pnpm db:seed`.

```bash
pnpm test:e2e
```

Flujos cubiertos en la Fase 1: alta + pago (simulado), bloqueo sin pago, alta manual + pago por Bizum, aislamiento del panel.
Pendientes (se añaden en su fase): registro de un entreno (Fase 2) y check-in (Fase 3).
