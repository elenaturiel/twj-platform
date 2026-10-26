import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/dal";
import { getPublicPlans, getSquadPlanKeys } from "@/features/billing/public-plans";
import { SignupForm } from "@/features/billing/signup-form";

export const metadata: Metadata = { title: "Crea tu cuenta" };

export default async function SignupPage({ searchParams }: PageProps<"/empezar/cuenta">) {
  const sp = await searchParams;
  const planKey = typeof sp.plan === "string" ? sp.plan : "";
  const interval = sp.intervalo === "year" ? "year" : "month";
  const [plans, squadPlanKeys] = await Promise.all([getPublicPlans(), getSquadPlanKeys()]);
  const plan = plans.find((p) => p.key === planKey);
  if (!plan) notFound();
  if (plan.requiresApplication) redirect("/empezar/peak");

  const viewer = await getViewer();
  if (viewer && viewer.role !== "client") {
    return (
      <p className="text-center">
        Estás con una cuenta del equipo ({viewer.email}). Cierra sesión para probar el alta como cliente.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/empezar" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          ← Cambiar de plan
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold">Vas a por {plan.name}</h1>
        <p className="text-muted-foreground">{plan.tagline}</p>
      </div>
      <SignupForm
        planKey={plan.key}
        planName={plan.name}
        annualAllowed={plan.annualAllowed}
        squadAllowed={squadPlanKeys.includes(plan.key)}
        initialInterval={plan.annualAllowed ? interval : "month"}
        loggedInAs={viewer?.email ?? null}
        initialSquadCode={typeof sp.squad === "string" ? sp.squad : undefined}
      />
    </div>
  );
}
