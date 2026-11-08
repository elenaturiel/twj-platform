import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { todayInMadrid } from "@/lib/dates";
import { formatSlot } from "@/domain/agenda/slots";
import { bookingDays } from "@/domain/agenda/slots";
import { getAgendaSettings, getAppointment, getBookableTypes } from "@/features/agenda/queries";
import { BookingFlow } from "@/features/agenda/ui/booking-flow";

export const metadata: Metadata = { title: "Reservar" };

export default async function BookPage({ searchParams }: PageProps<"/agenda/reservar">) {
  const ctx = await requireClientWithAccess();
  const sp = await searchParams;
  const settings = await getAgendaSettings();
  const days = bookingDays(todayInMadrid(), settings.horizonDays);
  const moveId = typeof sp.mover === "string" ? sp.mover : undefined;
  const moving = moveId ? await getAppointment(moveId) : null;
  if (moveId && (!moving || moving.client_id !== ctx.client.id || moving.status !== "confirmed")) notFound();

  const types = moving
    ? [
        {
          key: moving.type_key,
          name: moving.appointment_types?.name ?? "Cita",
          description: null,
          duration_min: moving.appointment_types?.duration_min ?? 60,
          modality: moving.modality,
          location: moving.location,
          credits: null,
          blockedReason: null,
        },
      ]
    : await getBookableTypes(ctx.client.id, days.at(-1)!);

  return (
    <div className="space-y-4">
      <Link href="/agenda" className="text-sm text-muted-foreground">
        ← Agenda
      </Link>
      <h1 className="text-3xl font-extrabold">{moving ? "Cambiar hora" : "Reservar"}</h1>
      {moving ? (
        <p className="text-sm text-muted-foreground">
          {moving.appointment_types?.name}: ahora el{" "}
          <span className="first-letter:uppercase">{formatSlot(moving.starts_at)}</span>. Elige la nueva hora.
        </p>
      ) : null}
      {types.length ? (
        <BookingFlow
          types={types}
          days={days}
          initialType={typeof sp.tipo === "string" ? sp.tipo : undefined}
          rescheduleId={moving?.id}
        />
      ) : (
        <p className="text-muted-foreground">Ahora mismo no hay citas que puedas reservar desde la app.</p>
      )}
    </div>
  );
}
