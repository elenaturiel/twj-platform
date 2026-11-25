import type { Metadata } from "next";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { SCOPE_LABELS, SCOPES } from "@/features/team/scopes";
import { DeactivateButton, InviteForm, PermissionSwitch } from "@/features/team/ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Equipo" };

export default async function TeamPage() {
  const viewer = await requireScope("team");
  const isOwner = viewer.role === "owner";
  const supabase = await createClient();
  const [{ data: staff }, { data: perms }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, deleted_at")
      .in("role", ["owner", "admin"])
      .order("role", { ascending: false }),
    supabase.from("staff_permissions").select("profile_id, scope"),
  ]);
  const has = (id: string, s: string) => (perms ?? []).some((p) => p.profile_id === id && p.scope === s);
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="text-3xl font-extrabold">Equipo y permisos</h1>
      <Card>
        <CardHeader>
          <CardTitle>Quién entra al panel</CardTitle>
          <CardDescription>
            El titular lo ve todo. Al resto se le dan permisos por áreas.{" "}
            {isOwner ? "" : "Solo el titular puede cambiarlos."}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 font-medium">Persona</th>
                {SCOPES.map((s) => (
                  <th key={s} className="px-2 text-center font-medium" title={SCOPE_LABELS[s].hint}>
                    {SCOPE_LABELS[s].label}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {(staff ?? []).map((p) => (
                <tr key={p.id} className={p.deleted_at ? "opacity-50" : ""}>
                  <td className="py-2">
                    <span className="font-medium">{p.full_name}</span>{" "}
                    {p.role === "owner" ? <Badge variant="secondary">Titular</Badge> : null}
                    {p.deleted_at ? <Badge variant="outline">Sin acceso</Badge> : null}
                    <span className="block text-xs text-muted-foreground">{p.email}</span>
                  </td>
                  {SCOPES.map((s) => (
                    <td key={s} className="px-2 text-center">
                      {p.role === "owner" ? (
                        "✓"
                      ) : (
                        <PermissionSwitch
                          profileId={p.id}
                          scope={s}
                          enabled={has(p.id, s)}
                          disabled={!isOwner || Boolean(p.deleted_at)}
                        />
                      )}
                    </td>
                  ))}
                  <td className="text-right">
                    {isOwner && p.role === "admin" && !p.deleted_at ? (
                      <DeactivateButton profileId={p.id} name={p.full_name} />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle>Invitar a alguien</CardTitle>
            <CardDescription>Le llega un email para crear su contraseña y entrar al panel.</CardDescription>
          </CardHeader>
          <CardContent>
            <InviteForm />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
