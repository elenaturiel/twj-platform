"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTACT_KINDS,
  CONTACT_STATUSES,
  DAY_LABELS,
  EQUIPMENT_LABELS,
  EXPERIENCE_LABELS,
  KIND_LABELS,
  STATUS_LABELS,
  type ContactKind,
  type ContactStatus,
} from "@/domain/contacts/contacts";
import { cn } from "@/lib/utils";
import { deleteContact, saveContact } from "./actions";

export type ContactValues = {
  id?: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  kind: ContactKind;
  status: ContactStatus;
  source: string | null;
  company: string | null;
  call_at: string | null;
  next_followup_on: string | null;
  age: number | null;
  experience: string | null;
  goal: string | null;
  injuries: string | null;
  available_days: number[];
  availability_notes: string | null;
  equipment: string | null;
  equipment_notes: string | null;
  allergy_notes: string | null;
  plan_interest: string | null;
  notes: string | null;
  lost_reason: string | null;
};

export const EMPTY_CONTACT: ContactValues = {
  full_name: "",
  email: null,
  phone: null,
  kind: "onboarding_call",
  status: "pending",
  source: null,
  company: null,
  call_at: null,
  next_followup_on: null,
  age: null,
  experience: null,
  goal: null,
  injuries: null,
  available_days: [],
  availability_notes: null,
  equipment: null,
  equipment_notes: null,
  allergy_notes: null,
  plan_interest: null,
  notes: null,
  lost_reason: null,
};

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

/** timestamptz → valor de <input type="datetime-local"> en hora de Madrid */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return parts.replace(" ", "T");
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-xl border bg-card p-4">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function ContactForm({ initial, plans }: { initial: ContactValues; plans: { key: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [days, setDays] = useState<number[]>(initial.available_days);
  const [kind, setKind] = useState<ContactKind>(initial.kind);
  const [status, setStatus] = useState<ContactStatus>(initial.status);
  const v = (x: string | number | null) => (x === null ? "" : String(x));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "");
    const callLocal = s("callAt");
    start(async () => {
      const res = await saveContact({
        id: initial.id,
        fullName: s("fullName"),
        email: s("email"),
        phone: s("phone"),
        kind,
        status,
        source: s("source"),
        company: s("company"),
        // La hora que escribe Jaime es de Madrid
        callAt: callLocal ? new Date(callLocal).toISOString() : "",
        nextFollowupOn: s("nextFollowupOn"),
        age: s("age"),
        experience: s("experience") as never,
        goal: s("goal"),
        injuries: s("injuries"),
        availableDays: days,
        availabilityNotes: s("availabilityNotes"),
        equipment: s("equipment") as never,
        equipmentNotes: s("equipmentNotes"),
        allergyNotes: s("allergyNotes"),
        planInterest: s("planInterest"),
        notes: s("notes"),
        lostReason: s("lostReason"),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Contacto guardado");
      if (!initial.id && res.id) router.push(`/panel/contactos/${res.id}`);
      else router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Section title="Datos">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="fullName">Nombre y apellidos</Label>
            <Input id="fullName" name="fullName" required minLength={2} defaultValue={initial.full_name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={v(initial.email)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={v(initial.phone)} placeholder="+34 600 000 000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="age">Edad</Label>
            <Input id="age" name="age" type="number" min={5} max={100} defaultValue={v(initial.age)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">¿Cómo ha llegado?</Label>
            <Input
              id="source"
              name="source"
              list="contact-sources"
              defaultValue={v(initial.source)}
              placeholder="Instagram, WhatsApp, un amigo…"
            />
            <datalist id="contact-sources">
              {["Instagram", "TikTok", "WhatsApp", "Recomendación", "Web", "Gimnasio", "Evento HYROX"].map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </div>
        </div>
      </Section>

      <Section title="Seguimiento">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="kind">Tipo de contacto</Label>
            <select
              id="kind"
              className={selectClass}
              value={kind}
              onChange={(e) => setKind(e.target.value as ContactKind)}
            >
              {CONTACT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <select
              id="status"
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as ContactStatus)}
            >
              {CONTACT_STATUSES.map((k) => (
                <option key={k} value={k}>
                  {STATUS_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          {kind === "collaboration" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="company">Marca, empresa o cuenta</Label>
              <Input id="company" name="company" defaultValue={v(initial.company)} placeholder="@marca, gimnasio…" />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="callAt">Fecha de la llamada</Label>
            <Input id="callAt" name="callAt" type="datetime-local" defaultValue={toLocalInput(initial.call_at)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextFollowupOn">Próximo seguimiento</Label>
            <Input id="nextFollowupOn" name="nextFollowupOn" type="date" defaultValue={v(initial.next_followup_on)} />
          </div>
          {kind !== "collaboration" ? (
            <div className="space-y-2">
              <Label htmlFor="planInterest">Plan que le encaja</Label>
              <select
                id="planInterest"
                name="planInterest"
                className={selectClass}
                defaultValue={v(initial.plan_interest)}
              >
                <option value="">Sin decidir</option>
                {plans.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {status === "lost" || status === "not_now" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="lostReason">Motivo</Label>
              <Input
                id="lostReason"
                name="lostReason"
                defaultValue={v(initial.lost_reason)}
                placeholder="Precio, horarios, se va de Erasmus…"
              />
            </div>
          ) : null}
        </div>
      </Section>

      {kind !== "collaboration" ? (
        <Section title="Lo que cuenta en la llamada">
          <p className="-mt-2 text-xs text-muted-foreground">
            Si acaba siendo cliente, esto pasa a su ficha y se la encontrará ya rellena.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="goal">Objetivo</Label>
              <Textarea id="goal" name="goal" rows={2} defaultValue={v(initial.goal)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience">Nivel</Label>
              <select id="experience" name="experience" className={selectClass} defaultValue={v(initial.experience)}>
                <option value="">Sin indicar</option>
                {Object.entries(EXPERIENCE_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipment">Acceso a gimnasio</Label>
              <select id="equipment" name="equipment" className={selectClass} defaultValue={v(initial.equipment)}>
                <option value="">Sin indicar</option>
                {Object.entries(EQUIPMENT_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="equipmentNotes">Material que tiene</Label>
              <Input id="equipmentNotes" name="equipmentNotes" defaultValue={v(initial.equipment_notes)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="injuries">Lesiones o limitaciones</Label>
              <Textarea id="injuries" name="injuries" rows={2} defaultValue={v(initial.injuries)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <span className="text-sm leading-none font-medium">Días que puede entrenar</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Días que puede entrenar">
                {DAY_LABELS.map((d, i) => {
                  const on = days.includes(i);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDays(on ? days.filter((x) => x !== i) : [...days, i])}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm",
                        on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="availabilityNotes">Disponibilidad y horario</Label>
              <Input
                id="availabilityNotes"
                name="availabilityNotes"
                defaultValue={v(initial.availability_notes)}
                placeholder="Mañanas antes de clase, fines de semana libres…"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="allergyNotes">Alergias y preferencias de comida</Label>
              <Textarea id="allergyNotes" name="allergyNotes" rows={2} defaultValue={v(initial.allergy_notes)} />
            </div>
          </div>
        </Section>
      ) : null}

      <Section title="Notas">
        <Textarea
          id="notes"
          name="notes"
          aria-label="Notas"
          rows={6}
          defaultValue={v(initial.notes)}
          placeholder="Todo lo que quieras recordar de esta persona"
        />
      </Section>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : initial.id ? "Guardar cambios" : "Crear contacto"}
        </Button>
        {initial.id ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            disabled={pending}
            onClick={() => {
              if (!confirm(`¿Borrar a ${initial.full_name} de contactos? No se puede deshacer.`)) return;
              start(async () => {
                const r = await deleteContact(initial.id!);
                if (!r.ok) toast.error(r.error);
                else {
                  toast.success("Contacto borrado");
                  router.push("/panel/contactos");
                }
              });
            }}
          >
            Borrar contacto
          </Button>
        ) : null}
      </div>
    </form>
  );
}
