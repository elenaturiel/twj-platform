import { requireScope } from "@/lib/auth/dal";
import { getPublicSettings } from "@/lib/settings";
import { formatSlot } from "@/domain/agenda/slots";
import {
  CREDIT_LABELS,
  getAppointmentTypes,
  getClientAppointments,
  getCreditBalances,
  getCreditLedger,
} from "@/features/agenda/queries";
import { AppointmentDialog, CreditsAdmin, NewAppointment, StatusBadge } from "@/features/agenda/ui/staff-agenda";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const REASONS: Record<string, string> = {
  monthly_grant: "Concesión mensual",
  purchase: "Compra",
  manual: "Ajuste manual",
  consume: "Reserva",
  refund: "Devolución",
  expire: "Caducado",
};

export default async function ClientAgenda({ params }: PageProps<"/panel/clientes/[id]/agenda">) {
  await requireScope("clients");
  const { id } = await params;
  const [{ upcoming, past }, balances, ledger, types, settings] = await Promise.all([
    getClientAppointments(id),
    getCreditBalances(id),
    getCreditLedger(id),
    getAppointmentTypes(),
    getPublicSettings(),
  ]);
  const all = [...upcoming, ...past];
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["live_training", "monthly_call", "extra"] as const).map((k) => (
          <div key={k} className="rounded-xl border bg-card px-3 py-2">
            <p className="text-xs text-muted-foreground">{CREDIT_LABELS[k]}</p>
            <p className="text-xl font-extrabold tabular-nums">{balances[k]}</p>
          </div>
        ))}
        <div className="ml-auto">
          <NewAppointment
            clients={[]}
            fixedClientId={id}
            types={types.filter((t) => t.is_active).map((t) => ({ key: t.key, name: t.name }))}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Citas</CardTitle>
        </CardHeader>
        <CardContent>
          {all.length ? (
            <ul className="divide-y">
              {all.map((a) => (
                <li key={a.id}>
                  <AppointmentDialog a={a}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-1 py-2 text-left text-sm hover:bg-muted/50"
                    >
                      <span className="flex-1">
                        <span className="font-medium">{a.appointment_types?.name}</span>
                        <span className="block text-muted-foreground first-letter:uppercase">
                          {formatSlot(a.starts_at)}
                        </span>
                        {a.goals.length ? (
                          <span className="block text-xs text-muted-foreground">Objetivos: {a.goals.join(" · ")}</span>
                        ) : null}
                      </span>
                      <StatusBadge status={a.status} />
                    </button>
                  </AppointmentDialog>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Sin citas todavía.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Créditos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CreditsAdmin clientId={id} extraPriceCents={settings.extraSessionPriceCents} />
          {ledger.length ? (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Fecha</th>
                  <th className="font-medium">Tipo</th>
                  <th className="font-medium">Movimiento</th>
                  <th className="text-right font-medium">±</th>
                  <th className="hidden font-medium sm:table-cell">Caduca</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ledger.map((l) => (
                  <tr key={l.id}>
                    <td className="py-1.5">{fmtDate(l.created_at)}</td>
                    <td>{CREDIT_LABELS[l.credit_type]}</td>
                    <td>
                      {REASONS[l.reason] ?? l.reason}
                      {l.notes ? <span className="text-muted-foreground"> · {l.notes}</span> : null}
                    </td>
                    <td className="text-right font-semibold tabular-nums">{l.delta > 0 ? `+${l.delta}` : l.delta}</td>
                    <td className="hidden text-muted-foreground sm:table-cell">
                      {l.expires_at ? fmtDate(l.expires_at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
