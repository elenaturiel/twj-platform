import { z } from "zod";
import { MODALITIES, partParamsSchema, prescriptionSchema } from "@/domain/training/prescription";

export const exerciseSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, { error: "Pon un nombre" }).max(120),
  modality: z.enum(MODALITIES),
  muscle_groups: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  equipment: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  video_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https:\/\//.test(v), { error: "El vídeo tiene que ser un enlace https://" })
    .default(""),
  instructions: z.string().trim().max(3000).default(""),
  common_mistakes: z.string().trim().max(3000).default(""),
  tags: z.array(z.string().trim().min(1).max(30)).max(15).default([]),
  is_active: z.boolean().default(true),
});

export const itemSchema = z.object({
  id: z.uuid().optional(),
  part_id: z.uuid(),
  exercise_id: z.uuid().nullable(),
  name: z.string().trim().max(120).nullable(),
  superset_group: z.string().trim().max(5).nullable().default(null),
  prescription: prescriptionSchema,
  notes: z.string().trim().max(1000).nullable().default(null),
});

export const partSchema = z.object({
  id: z.uuid().optional(),
  session_id: z.uuid(),
  title: z.string().trim().max(80).nullable().default(null),
  modality: z.enum(MODALITIES),
  format: z.string(),
  params: partParamsSchema,
  notes: z.string().trim().max(1000).nullable().default(null),
});

export const logSchema = z.object({
  id: z.uuid(),
  session_id: z.uuid().nullable(),
  title: z.string().max(120).nullable(),
  started_at: z.iso.datetime({ offset: true }),
  completed_at: z.iso.datetime({ offset: true }),
  // Un reloj del móvil que salta no debe hacer perder el entreno: negativo → 0
  total_time_s: z
    .number()
    .int()
    .max(86400)
    .transform((n) => Math.max(0, n))
    .nullable(),
  session_rpe: z.number().min(0).max(10).nullable(),
  feeling: z.number().int().min(1).max(5).nullable(),
  comment: z.string().max(2000).nullable(),
  sets: z
    .array(
      z.object({
        id: z.uuid(),
        session_item_id: z.uuid().nullable(),
        exercise_id: z.uuid().nullable(),
        set_index: z.number().int().min(0).max(50),
        reps: z.number().int().min(0).max(1000).nullable(),
        load_kg: z.number().min(0).max(1000).nullable(),
        rpe: z.number().min(0).max(10).nullable(),
        duration_s: z.number().int().min(0).max(86400).nullable(),
        distance_m: z.number().int().min(0).max(500000).nullable(),
        station_key: z.string().max(40).nullable(),
        notes: z.string().max(500).nullable(),
      }),
    )
    .max(300),
});
export type WorkoutLogInput = z.infer<typeof logSchema>;
