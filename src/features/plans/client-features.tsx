"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setClientFeature } from "./override-actions";

export type ClientFeatureRow = {
  key: string;
  name: string;
  kind: "bool" | "limit";
  unit: string | null;
  planEnabled: boolean;
  planLimit: number | null;
  override: { enabled: boolean; limit: number | null } | null;
};

const UNIT: Record<string, string> = { per_month: "al mes", days: "días" };

function Row({ clientId, f, canEdit }: { clientId: string; f: ClientFeatureRow; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const enabled = f.override ? f.override.enabled : f.planEnabled;
  const limit = f.override ? f.override.limit : f.planLimit;
  const [draft, setDraft] = useState(limit === null ? "" : String(limit));
  const save = (next: { enabled: boolean | null; limit: number | null }) =>
    start(async () => {
      const r = await setClientFeature({ clientId, featureKey: f.key, ...next });
      if (!r.ok) toast.error(r.error);
      else router.refresh();
    });

  return (
    <li className="flex flex-wrap items-center gap-3 py-2 text-sm">
      <Switch
        checked={enabled}
        disabled={!canEdit || pending}
        aria-label={f.name}
        onCheckedChange={(v) => save({ enabled: v, limit })}
      />
      <span className="min-w-0 flex-1">
        {f.name}
        {f.override ? <span className="ml-2 text-xs font-medium text-accent">ajustado para este cliente</span> : null}
      </span>
      {f.kind === "limit" && enabled ? (
        <span className="flex items-center gap-1">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
            onBlur={() => {
              const n = draft === "" ? null : Number(draft);
              if (n !== limit) save({ enabled: true, limit: n });
            }}
            disabled={!canEdit || pending}
            inputMode="numeric"
            aria-label={`Cantidad de ${f.name}`}
            placeholder="∞"
            className="h-8 w-16 text-right"
          />
          <span className="text-xs text-muted-foreground">{f.unit ? (UNIT[f.unit] ?? f.unit) : ""}</span>
        </span>
      ) : null}
      {f.override && canEdit ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setDraft(f.planLimit === null ? "" : String(f.planLimit));
            save({ enabled: null, limit: null });
          }}
        >
          Como el plan
        </Button>
      ) : null}
    </li>
  );
}

/** Qué incluye el plan de este cliente; en planes a medida, Jaime lo ajusta aquí. */
export function ClientFeatures({
  clientId,
  rows,
  canEdit,
}: {
  clientId: string;
  rows: ClientFeatureRow[];
  canEdit: boolean;
}) {
  return (
    <ul className="divide-y">
      {rows.map((f) => (
        <Row key={f.key} clientId={clientId} f={f} canEdit={canEdit} />
      ))}
    </ul>
  );
}
