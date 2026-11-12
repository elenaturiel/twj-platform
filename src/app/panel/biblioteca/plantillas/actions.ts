"use server";

import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createBlock, type TrainingResult } from "@/features/training/staff-actions";

export async function createTemplate(name: string, weeks: number): Promise<TrainingResult> {
  const viewer = await requireScope("clients");
  const supabase = await createClient();
  const { data: t, error } = await supabase
    .from("workout_templates")
    .insert({ name: name.trim().slice(0, 80) || "Plantilla", created_by: viewer.id })
    .select("id")
    .single();
  if (error || !t) return { ok: false, error: "No se ha podido crear la plantilla." };
  return createBlock({
    clientId: null,
    templateId: t.id,
    name,
    goal: "",
    startsOn: null,
    weeks: Math.min(Math.max(weeks || 4, 1), 16),
  });
}
