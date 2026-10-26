import { Badge } from "@/components/ui/badge";

export const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pendiente de pago",
  active: "Activo",
  past_due: "Pago vencido",
  paused: "Pausado",
  cancelled: "Baja",
};

export const MODALITY_LABELS: Record<string, string> = {
  gym: "Gym",
  functional: "Funcional",
  running: "Running",
  hyrox: "HYROX",
};
export const METHOD_LABELS: Record<string, string> = {
  stripe: "Tarjeta",
  bizum: "Bizum",
  transfer: "Transferencia",
  cash: "Efectivo",
  other: "Otro",
};

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "active" ? "secondary" : status === "past_due" || status === "cancelled" ? "destructive" : "outline";
  return <Badge variant={variant}>{STATUS_LABELS[status] ?? status}</Badge>;
}

export function formatDate(date: string | null | undefined, withTime = false) {
  if (!date) return "—";
  const d = date.length === 10 ? new Date(`${date}T12:00:00Z`) : new Date(date);
  return d.toLocaleDateString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}
