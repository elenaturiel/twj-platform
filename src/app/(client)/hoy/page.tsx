import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell, Video } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { getPublicSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/twj/empty-state";
import { WhatsAppButton } from "@/components/twj/whatsapp-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Hoy" };

export default async function TodayPage() {
  const ctx = await requireClientWithAccess();
  const t = await getTranslations("client.today");
  const tc = await getTranslations("common");
  const settings = await getPublicSettings();
  const supabase = await createClient();
  const { data: hasLive } = await supabase.rpc("has_feature", {
    p_client_id: ctx.client.id,
    p_feature: "live_sessions",
  });
  const firstName = ctx.viewer.fullName.split(" ")[0] || "crack";

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{ctx.client.planName ? `Plan ${ctx.client.planName}` : null}</p>
          <h1 className="text-3xl font-extrabold">{t("greeting", { name: firstName })}</h1>
        </div>
        {settings.whatsappNumber ? (
          <WhatsAppButton
            number={settings.whatsappNumber}
            clientName={ctx.viewer.fullName}
            planName={ctx.client.planName}
            label={tc("whatsapp")}
          />
        ) : null}
      </div>

      {/* El entreno en directo con Jaime es el diferenciador: siempre arriba */}
      <Card className="border-0 bg-gradient-to-br from-primary to-primary/85 text-primary-foreground">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Video className="size-5" aria-hidden />
            <CardTitle className="text-lg">{t("nextLiveSession")}</CardTitle>
          </div>
          <CardDescription className="text-primary-foreground/80">
            {hasLive ? t("noLiveSession") : t("liveSessionPitch")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasLive ? (
            <Button variant="secondary" size="sm" disabled>
              {t("bookLiveSession")} · {t("comingSoon")}
            </Button>
          ) : (
            <Button asChild variant="secondary" size="sm">
              <Link href="/perfil/plan?mejorar=mvp">{tc("upgradePlan")}</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">{t("todayWorkout")}</h2>
          <Badge variant="secondary">{t("comingSoon")}</Badge>
        </div>
        <EmptyState icon={Dumbbell} title={(await getTranslations("empty"))("workouts")} />
      </section>
    </div>
  );
}
