export const SCOPES = ["clients", "health", "billing", "business", "settings", "team"] as const;
export type Scope = (typeof SCOPES)[number];

export const SCOPE_LABELS: Record<Scope, { label: string; hint: string }> = {
  clients: { label: "Clientes", hint: "Planes, menús, agenda, chat, seguimiento" },
  health: { label: "Salud", hint: "Cuestionario de salud y datos sensibles" },
  billing: { label: "Pagos", hint: "Cobros, descuentos, facturas" },
  business: { label: "Negocio", hint: "Métricas y exportaciones" },
  settings: { label: "Ajustes", hint: "Ajustes, plantillas, textos legales" },
  team: { label: "Equipo", hint: "Ver el equipo y solicitudes RGPD" },
};
