import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, Video } from "lucide-react";
import { cheapestPlanWith, clientHasFeature, requireClientWithAccess } from "@/lib/auth/dal";
import { getPublicSettings } from "@/lib/settings";
import { formatEuros } from "@/lib/money";
import { CREDIT_LABELS, getClientAppointments, getCreditBalances, getCreditExpiries } from "@/features/agenda/queries";
import { AppointmentCard } from "@/features/agenda/ui/appointment-card";
import { BuyExtraButton } from "@/features/agenda/ui/buy-extra";
import { EmptyState } from "@/components/twj/empty-state";
import { LockedFeature } from "@/components/twj/locked-feature";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const ctx = await requireClientWithAccess();
  const sp = await searchParams;
  const [hasCall, hasLive, hasExtra] = await Promise.all([
    clientHasFeature(ctx.client.id, "monthly_call"),
    clientHasFeature(ctx.client.id, "live_sessions"),
    clientHasFeature(ctx.client.id, "extra_sessions"),
  ]);
  if (!hasCall && !hasLive) {
    const plan = await cheapestPlanWith("monthly_call");
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-extrabold">Agenda</h1>
        <div className="space-y-2 rounded-2xl bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground">
          <Video className="size-6" aria-hidden />
          <p className="text-lg font-bold">Entrena en directo con Jaime</p>
          <p className="text-sm text-primary-foreground/85">
            Videollamadas 1:1 para corregir técnica, cargas y ritmo en el momento. Es lo que más diferencia a TWJ.
          </p>
        </div>
        <LockedFeature planName={plan?.name ?? "All In"} planKey={plan?.key ?? "all_in"} />
      </div>
    );
  }

  const [{ upcoming, past }, balances, expiries, settings] = await Promise.all([
    getClientAppointments(ctx.client.id),
    getCreditBalances(ctx.client.id),
    getCreditExpiries(ctx.client.id),
    getPublicSettings(),
  ]);
  // eslint-disable-next-line react-hooks/purity -- hora de la petición (servidor)
  const now = Date.now();
  const credits = (["live_training", "monthly_call", "extra"] as const).filter(
    (k) => balances[k] > 0 || (k === "live_training" && hasLive) || (k === "monthly_call" && hasCall),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-2">
        <h1 className="text-3xl font-extrabold">Agenda</h1>
        <Button asChild size="sm">
          <Link href="/agenda/reservar">
            <CalendarPlus className="size-4" /> Reservar
          </Link>
        </Button>
      </div>
      {sp.extra === "ok" ? (
        <p className="rounded-xl bg-success/10 p-3 text-sm font-medium text-success">
          Pago recibido: ya tienes tu sesión extra para reservar.
        </p>
      ) : null}

      <section className="grid grid-cols-2 gap-2" aria-label="Créditos">
        {credits.map((k) => (
          <div key={k} className="rounded-2xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">{CREDIT_LABELS[k]}</p>
            <p className="text-2xl font-extrabold tabular-nums">{balances[k]}</p>
            {expiries[k] && balances[k] > 0 ? (
              <p className="text-xs text-muted-foreground">
                caducan el{" "}
                {new Date(expiries[k]!).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                  timeZone: "Europe/Madrid",
                })}
              </p>
            ) : null}
          </div>
        ))}
      </section>
      {hasExtra && settings.extraSessionPriceCents ? (
        <BuyExtraButton priceLabel={formatEuros(settings.extraSessionPriceCents)} />
      ) : null}

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Próximas</h2>
        {upcoming.length ? (
          upcoming.map((a) => <AppointmentCard key={a.id} a={a} upcoming now={now} />)
        ) : (
          <EmptyState icon={Video} title="No tienes citas reservadas.">
            <Link href="/agenda/reservar" className="text-sm underline">
              Reservar ahora
            </Link>
          </EmptyState>
        )}
      </section>

      {past.length ? (
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Anteriores</h2>
          {past.map((a) => (
            <AppointmentCard key={a.id} a={a} upcoming={false} now={now} />
          ))}
        </section>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Puedes cambiar o cancelar sin perder el crédito hasta 12 h antes. Los créditos del mes no se acumulan; las
        sesiones extra duran 3 meses.
      </p>
    </div>
  );
}
