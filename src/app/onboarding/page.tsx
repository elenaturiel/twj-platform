import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getClientContext, requireViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { todayInMadrid } from "@/lib/dates";
import { Logo } from "@/components/twj/logo";
import { OnboardingWizard, type HealthQuestionnaire } from "@/features/onboarding/onboarding-wizard";

export const metadata: Metadata = { title: "Tu ficha" };

export default async function OnboardingPage() {
  const viewer = await requireViewer();
  if (viewer.role !== "client") redirect("/panel");
  const ctx = await getClientContext();
  if (!ctx || ctx.access.kind !== "needs_onboarding") redirect(ctx?.access.kind === "ok" ? "/hoy" : "/estado");

  const supabase = await createClient();
  const [{ data: setting }, { data: intake }] = await Promise.all([
    supabase.from("settings").select("value").eq("key", "health_screening.questions").single(),
    supabase.from("client_intake").select("*").eq("client_id", ctx.client.id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <Logo compact className="text-2xl" />
      <div className="mt-6">
        <OnboardingWizard
          firstName={viewer.fullName.split(" ")[0] || "crack"}
          questionnaire={setting!.value as HealthQuestionnaire}
          today={todayInMadrid()}
          defaults={{
            goal: intake?.goal ?? undefined,
            birthDate: intake?.birth_date ?? undefined,
          }}
        />
      </div>
    </div>
  );
}
