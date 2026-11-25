"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deactivateStaff, inviteStaff, setPermission } from "./actions";
import { SCOPE_LABELS, SCOPES } from "./scopes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function PermissionSwitch({
  profileId,
  scope,
  enabled,
  disabled,
}: {
  profileId: string;
  scope: (typeof SCOPES)[number];
  enabled: boolean;
  disabled: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [pending, start] = useTransition();
  return (
    <Switch
      checked={on}
      disabled={disabled || pending}
      aria-label={SCOPE_LABELS[scope].label}
      onCheckedChange={(v) =>
        start(async () => {
          setOn(v);
          const r = await setPermission(profileId, scope, v);
          if (!r.ok) {
            setOn(!v);
            return void toast.error(r.error);
          }
          router.refresh();
        })
      }
    />
  );
}

export function DeactivateButton({ profileId, name }: { profileId: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm(`¿Quitar el acceso a ${name}?`)) return;
        start(async () => {
          const r = await deactivateStaff(profileId);
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message ?? "Hecho");
          router.refresh();
        });
      }}
    >
      Quitar acceso
    </Button>
  );
}

export function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<(typeof SCOPES)[number][]>(["clients"]);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await inviteStaff({ email, fullName: name, scopes });
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message ?? "Invitación enviada");
          setEmail("");
          setName("");
          router.refresh();
        });
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="inv-name">Nombre</Label>
          <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="inv-email">Email</Label>
          <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
      </div>
      <fieldset className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <legend className="mb-1 font-medium">Permisos</legend>
        {SCOPES.map((s) => (
          <label key={s} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={scopes.includes(s)}
              onChange={() => setScopes(scopes.includes(s) ? scopes.filter((x) => x !== s) : [...scopes, s])}
            />
            {SCOPE_LABELS[s].label}
          </label>
        ))}
      </fieldset>
      <Button type="submit" disabled={pending}>
        Invitar
      </Button>
    </form>
  );
}
