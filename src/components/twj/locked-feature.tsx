import Link from "next/link";
import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

/** Lo que ve el cliente cuando una función no está en su plan. */
export async function LockedFeature({ planName, planKey }: { planName: string; planKey: string }) {
  const t = await getTranslations("access");
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-secondary/60 p-6 text-center">
      <Lock className="size-6 text-muted-foreground" aria-hidden />
      <p className="font-medium">{t("lockedFeature", { plan: planName })}</p>
      <Button asChild size="sm">
        <Link href={`/perfil/plan?mejorar=${planKey}`}>{t("lockedFeatureCta", { plan: planName })}</Link>
      </Button>
    </div>
  );
}
