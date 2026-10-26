import type { Metadata } from "next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlanPicker } from "@/features/billing/plan-picker";
import { getFounderSlotsLeft, getPublicPlans } from "@/features/billing/public-plans";

export const metadata: Metadata = { title: "Empieza" };

// El −20 % anual es configurable (tabla discounts); aquí solo se muestra.
const ANNUAL_PERCENT = 20;

export default async function StartPage({ searchParams }: PageProps<"/empezar">) {
  const { cancelado } = await searchParams;
  const [plans, founderSlotsLeft] = await Promise.all([getPublicPlans(), getFounderSlotsLeft()]);

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">¿Y tú, quieres ganar?</p>
        <h1 className="text-4xl font-extrabold md:text-5xl">Elige tu plan</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          ¿Ya has hecho tu asesoría gratis con Jaime? Ahora toca empezar. Sin permanencia: cancelas cuando quieras.
        </p>
      </div>
      {cancelado ? (
        <Alert>
          <AlertDescription>Pago cancelado. No te hemos cobrado nada; cuando quieras, seguimos.</AlertDescription>
        </Alert>
      ) : null}
      <PlanPicker plans={plans} founderSlotsLeft={founderSlotsLeft} annualPercent={ANNUAL_PERCENT} />
      <div className="mx-auto max-w-2xl space-y-1 text-center text-sm text-muted-foreground">
        <p>
          −10 % con carné universitario (Jaime lo verifica). Squad: 2 amigos −15 % cada uno, 3 amigos −25 % (Rookie y
          All In).
        </p>
        <p>Los descuentos se suman. Precios con IVA incluido.</p>
      </div>
    </div>
  );
}
