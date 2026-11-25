import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPublicPlans } from "@/features/billing/public-plans";
import { PlanApplicationForm } from "@/features/billing/plan-application-form";

export const metadata: Metadata = { title: "Solicitar plan a medida" };

/** Solicitud de los planes a medida (sin precio publicado), salvo Peak, que tiene la suya. */
export default async function PlanApplicationPage({ searchParams }: PageProps<"/empezar/solicitud">) {
  const { plan: key } = await searchParams;
  if (key === "peak") redirect("/empezar/peak");
  const plan = (await getPublicPlans()).find((p) => p.key === key && p.requiresApplication);
  if (!plan) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/empezar" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← Ver todos los planes
      </Link>
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold">
          {plan.name}: {plan.tagline ?? "a medida"}
        </h1>
        {plan.description ? <p className="text-muted-foreground">{plan.description}</p> : null}
      </div>
      <PlanApplicationForm planKey={plan.key} planName={plan.name} />
    </div>
  );
}
