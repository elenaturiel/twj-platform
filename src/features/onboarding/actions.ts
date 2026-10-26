"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getClientContext } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInMadrid } from "@/lib/dates";
import { requestMeta, requestOrigin } from "@/lib/request";
import { sendTemplateEmail } from "@/lib/email/send";
import { healthScreeningHasFlags, isMinor } from "@/domain/onboarding/rules";
import { recordConsents } from "@/features/legal/consents.server";
import { guardianSchema, healthSchema, intakeSchema, intakeToRow, type IntakeInput } from "./schemas";
import { notifyProfileChanges } from "./notify-changes.server";

export type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

function zodErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const i of issues) fieldErrors[String(i.path[0])] ??= i.message;
  return fieldErrors;
}

export async function completeOnboarding(input: {
  intake: IntakeInput;
  health: { version: string; answers: Record<string, { answer: boolean; notes?: string }> };
  guardian?: { name: string; email: string };
}): Promise<ActionResult> {
  const ctx = await getClientContext();
  if (!ctx || ctx.access.kind === "pending_payment" || ctx.access.kind === "blocked") {
    return { ok: false, error: "Tu cuenta no está activa todavía." };
  }

  const intake = intakeSchema.safeParse(input.intake);
  if (!intake.success) return { ok: false, error: "Revisa tu ficha.", fieldErrors: zodErrors(intake.error.issues) };
  const health = healthSchema.safeParse(input.health);
  if (!health.success) return { ok: false, error: "Responde al cuestionario de salud." };

  const minor = isMinor(intake.data.birthDate, todayInMadrid());
  const guardian = minor ? guardianSchema.safeParse(input.guardian ?? {}) : null;
  if (guardian && !guardian.success) {
    return {
      ok: false,
      error: "Necesitamos los datos de tu tutor/a legal.",
      fieldErrors: zodErrors(guardian.error.issues),
    };
  }

  const supabase = await createClient();
  const { error: intakeErr } = await supabase
    .from("client_intake")
    .upsert({ client_id: ctx.client.id, ...intakeToRow(intake.data) }, { onConflict: "client_id" });
  if (intakeErr) return { ok: false, error: "No hemos podido guardar tu ficha." };

  const hasFlags = healthScreeningHasFlags(health.data.answers);
  const { error: healthErr } = await supabase.from("health_screenings").insert({
    client_id: ctx.client.id,
    version: health.data.version,
    answers: health.data.answers,
    has_flags: hasFlags,
  });
  if (healthErr) return { ok: false, error: "No hemos podido guardar el cuestionario." };

  const admin = createAdminClient();
  const origin = await requestOrigin();

  if (minor && guardian?.success) {
    const token = randomBytes(32).toString("base64url");
    await admin.from("guardian_authorizations").insert({
      client_id: ctx.client.id,
      guardian_name: guardian.data.name,
      guardian_email: guardian.data.email,
      token_hash: createHash("sha256").update(token).digest("hex"),
      sent_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    });
    await sendTemplateEmail({
      to: guardian.data.email,
      templateKey: "guardian_request",
      vars: { tutor: guardian.data.name, nombre: ctx.viewer.fullName, enlace: `${origin}/tutor/${token}` },
      cta: { label: "Revisar y autorizar", href: `${origin}/tutor/${token}` },
    });
  }

  await admin
    .from("clients")
    .update({
      onboarding_completed_at: new Date().toISOString(),
      is_minor: minor,
      guardian_status: minor ? "pending" : "not_required",
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", ctx.client.id);

  await admin.rpc("notify_staff", {
    p_type: "onboarding_completed",
    p_title: `${ctx.viewer.fullName} ha completado su ficha`,
    p_body: [
      `Objetivo: ${intake.data.goal}`,
      hasFlags ? "⚠️ Ha respondido SÍ a alguna pregunta del cuestionario de salud." : null,
      minor ? "Es menor de edad: pendiente de autorización del tutor/a." : null,
    ]
      .filter(Boolean)
      .join("\n"),
    p_link: `/panel/clientes/${ctx.client.id}/ficha`,
    p_client_id: ctx.client.id,
  });

  redirect(minor ? "/estado" : "/hoy?bienvenida=1");
}

/** Edición de la ficha desde el perfil: cada cambio avisa a Jaime. */
export async function updateIntake(input: IntakeInput): Promise<ActionResult> {
  const ctx = await getClientContext();
  if (!ctx) return { ok: false, error: "Sesión no válida." };
  const parsed = intakeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los campos.", fieldErrors: zodErrors(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_intake")
    .update(intakeToRow(parsed.data))
    .eq("client_id", ctx.client.id);
  if (error) return { ok: false, error: "No hemos podido guardar los cambios." };

  await notifyProfileChanges(ctx.client.id);
  revalidatePath("/perfil");
  return { ok: true };
}

/** El tutor/a autoriza desde el enlace del email (sin cuenta). */
export async function confirmGuardian(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (formData.get("accept") !== "on") redirect(`/tutor/${token}?error=accept`);
  const admin = createAdminClient();
  const hash = createHash("sha256").update(token).digest("hex");
  const { data: auth } = await admin
    .from("guardian_authorizations")
    .select("id, client_id, expires_at, confirmed_at, clients(profile_id, profiles(full_name))")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!auth || auth.confirmed_at || new Date(auth.expires_at) < new Date()) redirect(`/tutor/${token}?error=invalid`);

  const { ip } = await requestMeta();
  await admin
    .from("guardian_authorizations")
    .update({ confirmed_at: new Date().toISOString(), confirmed_ip: ip })
    .eq("id", auth.id);
  await admin.from("clients").update({ guardian_status: "confirmed" }).eq("id", auth.client_id);
  if (auth.clients?.profile_id) await recordConsents(auth.clients.profile_id, { guardian: true });
  await admin.rpc("notify_staff", {
    p_type: "guardian_confirmed",
    p_title: `Tutor/a ha autorizado a ${auth.clients?.profiles?.full_name ?? "un cliente"}`,
    p_link: `/panel/clientes/${auth.client_id}`,
    p_client_id: auth.client_id,
  });
  redirect(`/tutor/${token}?ok=1`);
}

/** Registra la foto del carné ya subida a Storage (bucket privado) para que Jaime la revise. */
export async function submitStudentCard(path: string): Promise<ActionResult> {
  const ctx = await getClientContext();
  if (!ctx) return { ok: false, error: "Sesión no válida." };
  if (!path.startsWith(`${ctx.client.id}/`)) return { ok: false, error: "Ruta no válida." };
  const supabase = await createClient();
  const { error } = await supabase.from("student_verifications").insert({ client_id: ctx.client.id, card_path: path });
  if (error) return { ok: false, error: "No hemos podido guardar el carné." };
  const admin = createAdminClient();
  await admin.rpc("notify_staff", {
    p_type: "student_card_uploaded",
    p_title: `${ctx.viewer.fullName} ha subido su carné universitario`,
    p_link: `/panel/pendientes`,
    p_client_id: ctx.client.id,
  });
  revalidatePath("/perfil/plan");
  return { ok: true };
}
