import { z } from "zod";

export const emailSchema = z.email({ error: "auth.emailInvalid" }).trim().toLowerCase();
export const passwordSchema = z.string().min(8, { error: "auth.passwordMin" });

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  next: z.string().optional(),
});
