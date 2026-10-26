"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteClientNote,
  registerManualPayment,
  reviewStudentCard,
  saveClientNote,
  saveOnboardingCall,
  sendCheckoutLink,
  signedFileUrl,
  updateClientAdmin,
  type StaffResult,
} from "./staff-actions";
import { MODALITY_LABELS } from "./ui";

function useAction() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<StaffResult>, ok?: string) =>
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? ok ?? "Hecho");
      else toast.error(res.error);
    });
  return { pending, run };
}

const selectCls = "border-input bg-background h-9 w-full rounded-md border px-2 text-sm";

export function ManualPaymentForm({
  subscriptionId,
  defaultAmountEuros,
  today,
  isFirst,
}: {
  subscriptionId: string;
  defaultAmountEuros: number;
  today: string;
  isFirst: boolean;
}) {
  const { pending, run } = useAction();
  const [custom, setCustom] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run(() =>
          registerManualPayment({
            subscriptionId,
            method: f.get("method") as "bizum",
            amountEuros: Number(String(f.get("amount")).replace(",", ".")),
            paidOn: String(f.get("paidOn")),
            periodStart: custom ? String(f.get("periodStart")) : "",
            periodEnd: custom ? String(f.get("periodEnd")) : "",
            notes: String(f.get("notes") ?? ""),
          }),
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="method">Método</Label>
          <select id="method" name="method" className={selectCls}>
            <option value="bizum">Bizum</option>
            <option value="transfer">Transferencia</option>
            <option value="cash">Efectivo</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="amount">Importe (€)</Label>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            defaultValue={defaultAmountEuros.toFixed(2).replace(".", ",")}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="paidOn">Fecha de pago</Label>
          <Input id="paidOn" name="paidOn" type="date" defaultValue={today} />
        </div>
      </div>
      <Label className="flex items-center gap-2 font-normal">
        <Checkbox checked={custom} onCheckedChange={(v) => setCustom(v === true)} /> Indicar el periodo a mano
      </Label>
      {custom ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="periodStart">Desde</Label>
            <Input id="periodStart" name="periodStart" type="date" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="periodEnd">Hasta (día de renovación)</Label>
            <Input id="periodEnd" name="periodEnd" type="date" />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          El periodo se calcula solo: sigue donde acabó el anterior (o empieza el día del pago si es el primero).
        </p>
      )}
      <Input name="notes" placeholder="Nota (opcional)" />
      <Button type="submit" disabled={pending}>
        {pending ? "Registrando…" : isFirst ? "Registrar primer pago y activar" : "Registrar pago"}
      </Button>
    </form>
  );
}

export function SendCheckoutButton({ clientId, label }: { clientId: string; label: string }) {
  const { pending, run } = useAction();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => run(() => sendCheckoutLink(clientId))}
    >
      {pending ? "Enviando…" : label}
    </Button>
  );
}

export function NoteForm({ clientId }: { clientId: string }) {
  const { pending, run } = useAction();
  const [body, setBody] = useState("");
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const res = await saveClientNote(clientId, body);
          if (res.ok) setBody("");
          return res;
        }, "Nota guardada");
      }}
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Nota privada (solo Jaime y Elena)"
      />
      <Button type="submit" size="sm" disabled={pending || !body.trim()}>
        Guardar nota
      </Button>
    </form>
  );
}

export function DeleteNoteButton({ noteId, clientId }: { noteId: string; clientId: string }) {
  const { pending, run } = useAction();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Borrar nota"
      disabled={pending}
      onClick={() => confirm("¿Borrar esta nota?") && run(() => deleteClientNote(noteId, clientId), "Nota borrada")}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

type Call = {
  held_at: string | null;
  notes: string | null;
  agreed_goals: string | null;
  metrics_to_track: string | null;
  initial_blocks: string | null;
  observations: string | null;
} | null;

export function OnboardingCallForm({ clientId, call }: { clientId: string; call: Call }) {
  const { pending, run } = useAction();
  const fields = [
    ["agreedGoals", "Objetivos acordados", call?.agreed_goals],
    ["metricsToTrack", "Métricas que vamos a medir", call?.metrics_to_track],
    ["initialBlocks", "Bloques iniciales", call?.initial_blocks],
    ["notes", "Notas de la llamada", call?.notes],
    ["observations", "Observaciones", call?.observations],
  ] as const;
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run(
          () =>
            saveOnboardingCall({
              clientId,
              heldAt: String(f.get("heldAt") ?? ""),
              agreedGoals: String(f.get("agreedGoals") ?? ""),
              metricsToTrack: String(f.get("metricsToTrack") ?? ""),
              initialBlocks: String(f.get("initialBlocks") ?? ""),
              notes: String(f.get("notes") ?? ""),
              observations: String(f.get("observations") ?? ""),
            }),
          "Llamada guardada",
        );
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="heldAt">Fecha de la llamada</Label>
        <Input
          id="heldAt"
          name="heldAt"
          type="datetime-local"
          defaultValue={call?.held_at?.slice(0, 16) ?? ""}
          className="w-auto"
        />
      </div>
      {fields.map(([name, label, value]) => (
        <div key={name} className="space-y-1">
          <Label htmlFor={name}>{label}</Label>
          <Textarea id={name} name={name} rows={2} defaultValue={value ?? ""} />
        </div>
      ))}
      <Button type="submit" size="sm" disabled={pending}>
        Guardar llamada
      </Button>
    </form>
  );
}

export function ClientAdminForm({
  clientId,
  modalities,
  tags,
}: {
  clientId: string;
  modalities: string[];
  tags: string[];
}) {
  const { pending, run } = useAction();
  const [mods, setMods] = useState(modalities);
  const [tagText, setTagText] = useState(tags.join(", "));
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateClientAdmin({ clientId, modalities: mods, tags: tagText.split(",") }), "Guardado");
      }}
    >
      <div className="flex flex-wrap gap-3">
        {Object.entries(MODALITY_LABELS).map(([key, label]) => (
          <Label key={key} className="flex items-center gap-2 font-normal">
            <Checkbox
              checked={mods.includes(key)}
              onCheckedChange={(v) => setMods((m) => (v ? [...m, key] : m.filter((x) => x !== key)))}
            />
            {label}
          </Label>
        ))}
      </div>
      <div className="space-y-1">
        <Label htmlFor="tags">Etiquetas (separadas por comas)</Label>
        <Input id="tags" value={tagText} onChange={(e) => setTagText(e.target.value)} />
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        Guardar
      </Button>
    </form>
  );
}

export function StudentCardReview({
  verificationId,
  clientId,
  path,
}: {
  verificationId: string;
  clientId: string;
  path: string;
}) {
  const { pending, run } = useAction();
  const [opening, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={opening}
        onClick={() =>
          start(async () => {
            const url = await signedFileUrl("student-cards", path, clientId);
            if (url) window.open(url, "_blank", "noopener");
            else toast.error("No se ha podido abrir el archivo.");
          })
        }
      >
        Ver carné
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => run(() => reviewStudentCard({ verificationId, approve: true }), "Aprobado")}
      >
        Aprobar
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => {
          const reason = prompt("Motivo del rechazo (se quitará el −10 % en la próxima cuota):") ?? undefined;
          if (reason !== undefined)
            run(() => reviewStudentCard({ verificationId, approve: false, reason }), "Rechazado");
        }}
      >
        Rechazar
      </Button>
    </div>
  );
}
