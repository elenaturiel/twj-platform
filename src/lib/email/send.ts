import "server-only";
import { render } from "@react-email/render";
import { Resend } from "resend";
import TwjEmail, { type TwjEmailProps } from "../../../emails/twj-email";
import { serverEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fillTemplate, toParagraphs } from "./templates";

export type SendResult = { ok: true; id?: string; skipped?: boolean } | { ok: false; error: string };

export async function sendEmail(params: { to: string; subject: string } & TwjEmailProps): Promise<SendResult> {
  const { RESEND_API_KEY, EMAIL_FROM } = serverEnv();
  const html = await render(TwjEmail(params));
  const text = await render(TwjEmail(params), { plainText: true });

  if (!RESEND_API_KEY) {
    // Sin clave (local/CI): no se envía nada, se deja traza.
    console.info(`[email:skip] → ${params.to} · ${params.subject}`);
    return { ok: true, skipped: true };
  }

  const resend = new Resend(RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html,
    text,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id };
}

/** Envía un email usando el texto editable de `message_templates`. */
export async function sendTemplateEmail(params: {
  to: string;
  templateKey: string;
  vars: Record<string, string | number | null | undefined>;
  cta?: { label: string; href: string };
}): Promise<SendResult> {
  const admin = createAdminClient();
  const { data: tpl } = await admin
    .from("message_templates")
    .select("subject, body")
    .eq("key", params.templateKey)
    .maybeSingle();
  if (!tpl) return { ok: false, error: `Plantilla ${params.templateKey} no existe` };

  const subject = fillTemplate(tpl.subject ?? "Train with Jaime", params.vars);
  const paragraphs = toParagraphs(fillTemplate(tpl.body, params.vars));
  return sendEmail({ to: params.to, subject, preview: subject, paragraphs, cta: params.cta });
}
