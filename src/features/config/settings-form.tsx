"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveSetting, setDigestPreference } from "./actions";

export function SettingRow({
  settingKey,
  label,
  description,
  value,
}: {
  settingKey: string;
  label: string;
  description: string | null;
  value: unknown;
}) {
  const [pending, start] = useTransition();
  const initial = typeof value === "string" ? value : JSON.stringify(value);
  return (
    <form
      className="grid items-end gap-2 sm:grid-cols-[1fr_220px_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        const raw = String(new FormData(e.currentTarget).get("value") ?? "");
        start(async () => {
          const r = await saveSetting(settingKey, raw);
          if (r.ok) toast.success("Guardado");
          else toast.error(r.error);
        });
      }}
    >
      <div>
        <Label htmlFor={settingKey}>{label}</Label>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Input id={settingKey} name="value" defaultValue={initial} />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        Guardar
      </Button>
    </form>
  );
}

export function DigestToggle({ digest }: { digest: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Label className="flex items-center gap-3 font-normal">
      <Switch
        defaultChecked={digest}
        disabled={pending}
        onCheckedChange={(v) =>
          start(async () => {
            const r = await setDigestPreference(v);
            if (r.ok) toast.success(v ? "Recibirás un resumen diario por email" : "Avisos al momento");
          })
        }
      />
      Agrupar mis avisos por email en un resumen diario
    </Label>
  );
}
