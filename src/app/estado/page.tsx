import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getClientContext, requireViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/features/auth/actions";
import { AuthShell } from "@/features/auth/auth-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Estado de tu cuenta" };

/** A dónde va un cliente que todavía no puede entrar en la app (y por qué). */
export default async function StatusPage() {
  const viewer = await requireViewer();
  if (viewer.role !== "client") redirect("/panel");

  const t = await getTranslations("access");
  const ctx = await getClientContext();

  if (!ctx) {
    return (
      <AuthShell title="Aún no tienes plan" subtitle="Tu cuenta existe, pero todavía no hay un plan activo asociado.">
        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/empezar">Elegir plan</Link>
          </Button>
          <SignOutButton />
        </div>
      </AuthShell>
    );
  }

  switch (ctx.access.kind) {
    case "ok":
      redirect("/hoy");
    case "needs_onboarding":
      redirect("/onboarding");
    case "pending_payment":
      return (
        <AuthShell title={t("pendingPaymentTitle")} subtitle={t("pendingPaymentBody")}>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/estado">Comprobar otra vez</Link>
            </Button>
            <SignOutButton />
          </div>
        </AuthShell>
      );
    case "guardian_pending": {
      const supabase = await createClient();
      const { data } = await supabase
        .from("guardian_authorizations")
        .select("guardian_email")
        .eq("client_id", ctx.client.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (
        <AuthShell
          title={t("guardianPendingTitle")}
          subtitle={t("guardianPendingBody", { email: data?.guardian_email ?? "tu tutor/a" })}
        >
          <SignOutButton />
        </AuthShell>
      );
    }
    case "blocked": {
      const key = ctx.access.reason === "cancelled" ? "cancelled" : "blocked";
      return (
        <AuthShell title={t(`${key}Title`)} subtitle={t(`${key}Body`)}>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href={ctx.access.reason === "cancelled" ? "/empezar" : "/perfil/plan"}>
                {ctx.access.reason === "cancelled" ? "Volver a empezar" : "Regularizar pago"}
              </Link>
            </Button>
            <SignOutButton />
          </div>
        </AuthShell>
      );
    }
  }
}

function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" className="w-full">
        Cerrar sesión
      </Button>
    </form>
  );
}
