import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/features/onboarding/profile-form";
import { OwnCustomFields } from "@/features/tracking/ui/own-custom-fields";
import type { IntakeInput } from "@/features/onboarding/schemas";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const ctx = await requireClientWithAccess();
  const supabase = await createClient();
  const [{ data: i }, { data: cf }] = await Promise.all([
    supabase.from("client_intake").select("*").eq("client_id", ctx.client.id).single(),
    supabase
      .from("custom_field_values")
      .select("value, custom_fields!inner(id, label, type, options, client_editable, is_active)")
      .eq("client_id", ctx.client.id)
      .eq("custom_fields.client_editable", true)
      .eq("custom_fields.is_active", true),
  ]);

  const defaults: IntakeInput = {
    goal: i?.goal ?? "",
    birthDate: i?.birth_date ?? "",
    injuries: i?.injuries ?? "",
    experience: (i?.experience ?? undefined) as IntakeInput["experience"],
    availableDays: i?.available_days ?? [],
    equipment: (i?.equipment ?? undefined) as IntakeInput["equipment"],
    equipmentNotes: i?.equipment_notes ?? "",
    allergens: (i?.allergens ?? []) as IntakeInput["allergens"],
    allergyNotes: i?.allergy_notes ?? "",
    foodBudgetEuros: i?.food_budget_cents == null ? null : i.food_budget_cents / 100,
    foodBudgetPeriod: (i?.food_budget_period ?? "week") as "week" | "month",
    classSchedule: i?.class_schedule ?? "",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Tu ficha</h1>
        <p className="text-sm text-muted-foreground">
          {ctx.viewer.fullName} · {ctx.viewer.email}. Si cambias algo, a Jaime le llega un aviso para ajustar tu plan.
        </p>
      </div>
      <Link
        href="/perfil/plan"
        className="flex items-center justify-between rounded-xl border px-4 py-3 hover:bg-muted/50"
      >
        <span>
          <span className="font-medium">Mi plan: {ctx.client.planName}</span>
          <span className="block text-xs text-muted-foreground">Pagos, descuentos y squad</span>
        </span>
        <ChevronRight className="size-4" aria-hidden />
      </Link>
      <Link
        href="/perfil/notificaciones"
        className="flex items-center justify-between rounded-xl border px-4 py-3 hover:bg-muted/50"
      >
        <span>
          <span className="font-medium">Avisos</span>
          <span className="block text-xs text-muted-foreground">Push en el móvil y qué emails recibes</span>
        </span>
        <ChevronRight className="size-4" aria-hidden />
      </Link>
      <ProfileForm defaults={defaults} />
      <OwnCustomFields
        fields={(cf ?? []).map((v) => ({
          id: v.custom_fields.id,
          label: v.custom_fields.label,
          type: v.custom_fields.type,
          options: v.custom_fields.options,
          value: v.value == null ? "" : String(v.value),
        }))}
      />
    </div>
  );
}
