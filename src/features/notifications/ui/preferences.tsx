"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { effectivePreference, type NotificationTypeInfo, type PreferenceRow } from "@/domain/notifications/catalog";
import { savePreferences } from "../actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

/** Tabla de avisos: email y push por tipo (y "en el resumen diario" para el equipo). */
export function NotificationPreferences({
  types,
  initial,
  allowDigest,
}: {
  types: NotificationTypeInfo[];
  initial: PreferenceRow[];
  allowDigest: boolean;
}) {
  const [rows, setRows] = useState(() =>
    types.map((t) => ({
      ...t,
      email: effectivePreference(initial, t.type, "email"),
      push: effectivePreference(initial, t.type, "push"),
    })),
  );
  const [pending, start] = useTransition();
  const groups = [...new Set(rows.map((r) => r.group))];
  const set = (type: string, patch: Partial<(typeof rows)[number]>) =>
    setRows(rows.map((r) => (r.type === type ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g} className="space-y-1">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{g}</h3>
          <ul className="divide-y rounded-xl border">
            {rows
              .filter((r) => r.group === g)
              .map((r) => (
                <li key={r.type} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 text-sm">
                  <span className="min-w-40 flex-1">
                    {r.label}
                    {r.critical ? (
                      <span className="block text-xs text-muted-foreground">Recomendado dejarlo activado</span>
                    ) : null}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs">
                    <Switch
                      checked={r.email.enabled}
                      onCheckedChange={(v) => set(r.type, { email: { ...r.email, enabled: v } })}
                      aria-label={`${r.label}: email`}
                    />
                    Email
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <Switch
                      checked={r.push.enabled}
                      onCheckedChange={(v) => set(r.type, { push: { ...r.push, enabled: v } })}
                      aria-label={`${r.label}: push`}
                    />
                    Push
                  </label>
                  {allowDigest ? (
                    <label className="flex items-center gap-1.5 text-xs">
                      <Switch
                        checked={r.email.digest}
                        disabled={!r.email.enabled}
                        onCheckedChange={(v) => set(r.type, { email: { ...r.email, digest: v } })}
                        aria-label={`${r.label}: en el resumen diario`}
                      />
                      Resumen diario
                    </label>
                  ) : null}
                </li>
              ))}
          </ul>
        </section>
      ))}
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const payload = rows.flatMap((r) => [
              { type: r.type, channel: "email" as const, enabled: r.email.enabled, digest: r.email.digest },
              { type: r.type, channel: "push" as const, enabled: r.push.enabled, digest: false },
            ]);
            const res = await savePreferences(payload);
            if (!res.ok) return void toast.error(res.error);
            toast.success("Preferencias guardadas");
          })
        }
      >
        Guardar preferencias
      </Button>
    </div>
  );
}
