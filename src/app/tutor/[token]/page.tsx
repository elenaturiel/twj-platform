import type { Metadata } from "next";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmGuardian } from "@/features/onboarding/actions";
import { AuthShell } from "@/features/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Autorización del tutor/a" };

export default async function GuardianPage({ params, searchParams }: PageProps<"/tutor/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  if (sp.ok) {
    return (
      <AuthShell title="¡Gracias!" subtitle="Autorización registrada. Ya puede empezar a entrenar.">
        {null}
      </AuthShell>
    );
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("guardian_authorizations")
    .select("guardian_name, expires_at, confirmed_at, clients(profiles(full_name), plans(name))")
    .eq("token_hash", createHash("sha256").update(token).digest("hex"))
    .maybeSingle();

  if (!data || data.confirmed_at || new Date(data.expires_at) < new Date()) {
    return (
      <AuthShell
        title="Enlace no válido"
        subtitle="Ha caducado o ya se usó. Pide a quien te lo envió que lo solicite de nuevo."
      >
        {null}
      </AuthShell>
    );
  }

  const minorName = data.clients?.profiles?.full_name ?? "";
  return (
    <AuthShell title={`Hola, ${data.guardian_name}`} subtitle={`${minorName} quiere entrenar con Train with Jaime.`}>
      <form action={confirmGuardian} className="space-y-4 text-sm">
        <input type="hidden" name="token" value={token} />
        <p>
          Train with Jaime es un servicio online de entrenamiento y nutrición personalizados (plan{" "}
          {data.clients?.plans?.name}). Para prepararlo tratamos datos de salud (lesiones, alergias, medidas) que solo
          ven Jaime y Elena.
        </p>
        {/* TODO(legal): texto de autorización revisado por un profesional */}
        <Label className="flex items-start gap-3 font-normal">
          <Checkbox name="accept" value="on" />
          <span>
            Soy su madre, padre o tutor/a legal, autorizo su alta y consiento el tratamiento de sus datos (incluidos los
            de salud) según la política de privacidad.
          </span>
        </Label>
        {sp.error === "accept" ? <p className="text-xs text-destructive">Marca la casilla para autorizar.</p> : null}
        <Button type="submit" className="w-full">
          Autorizar
        </Button>
      </form>
    </AuthShell>
  );
}
