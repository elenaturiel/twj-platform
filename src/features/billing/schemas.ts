import { z } from "zod";

export const intervalSchema = z.enum(["month", "year"]);

export const quoteInputSchema = z.object({
  planKey: z.string().regex(/^[a-z0-9_]+$/),
  interval: intervalSchema,
  studentClaim: z.boolean().default(false),
  squadCode: z.string().trim().max(32).optional().or(z.literal("")),
  promoCode: z.string().trim().max(40).optional().or(z.literal("")),
});
export type QuoteInput = z.infer<typeof quoteInputSchema>;

export const signupSchema = quoteInputSchema.extend({
  squadMode: z.enum(["none", "create", "join"]).default("none"),
  fullName: z.string().trim().min(2, { error: "Pon tu nombre" }).max(120).optional(),
  email: z.email({ error: "Email no válido" }).trim().toLowerCase().optional(),
  password: z.string().min(8, { error: "Mínimo 8 caracteres" }).optional(),
  acceptTerms: z.literal(true, { error: "Tienes que aceptar los términos y la privacidad" }),
  acceptHealth: z.literal(true, { error: "Sin este consentimiento no podemos preparar tu plan" }),
  acceptPhotos: z.boolean().default(false),
  acceptMarketing: z.boolean().default(false),
});
export type SignupInput = z.infer<typeof signupSchema>;
