"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setOwnCustomField } from "../client-actions";

/** Campos personalizados que Jaime ha marcado como editables por el cliente. */
export function OwnCustomFields({
  fields,
}: {
  fields: { id: string; label: string; type: string; options: string[]; value: string }[];
}) {
  const [pending, start] = useTransition();
  if (!fields.length) return null;
  return (
    <section className="space-y-3 rounded-2xl border p-4">
      <h2 className="font-semibold">Más datos para Jaime</h2>
      {fields.map((f) => (
        <form
          key={f.id}
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = String(new FormData(e.currentTarget).get("v") ?? "");
            start(async () => {
              const r = await setOwnCustomField(f.id, v);
              if (r.ok) toast.success("Guardado");
              else toast.error(r.error);
            });
          }}
        >
          <div className="flex-1 space-y-1">
            <Label htmlFor={`cf-${f.id}`}>{f.label}</Label>
            {f.type === "select" ? (
              <select
                id={`cf-${f.id}`}
                name="v"
                defaultValue={f.value}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">—</option>
                {f.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <Input
                id={`cf-${f.id}`}
                name="v"
                defaultValue={f.value}
                type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
              />
            )}
          </div>
          <Button size="sm" variant="secondary" disabled={pending}>
            Guardar
          </Button>
        </form>
      ))}
    </section>
  );
}
