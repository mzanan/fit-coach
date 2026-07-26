"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  canExtractInbody,
  extractInbody,
  type InbodyExtraction,
} from "@/lib/ai/inbody";
import { db, schema } from "@/lib/db";
import { toModelDataUrl } from "@/lib/imageNormalize";
import { requireUser } from "@/lib/session";

const { body_scans } = schema;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export interface InbodyScanRead {
  extraction: InbodyExtraction;
  image: string;
}

export async function extractInbodyScan(
  formData: FormData,
): Promise<InbodyScanRead> {
  await requireUser();
  if (!canExtractInbody()) throw new Error("AI key is not configured");

  const file = formData.get("image");
  if (!(file instanceof File)) throw new Error("No image received");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image too large (max 8 MB)");

  const image = await toModelDataUrl(file);
  return { extraction: await extractInbody(image), image };
}

const measure = z.number().min(0).max(10000).nullable();

const scanInput = z.object({
  taken_at: z.string().min(1),
  device: z.string().max(80).nullable(),
  location: z.string().max(120).nullable(),
  member_id: z.string().max(80).nullable(),
  gender: z.string().max(20).nullable(),
  body_balance_upper: z.string().max(40).nullable(),
  body_balance_lower: z.string().max(40).nullable(),
  body_balance_upper_lower: z.string().max(40).nullable(),
  height_cm: measure,
  age: measure,
  weight_kg: measure,
  skeletal_muscle_kg: measure,
  body_fat_kg: measure,
  body_fat_pct: measure,
  bmi: measure,
  visceral_fat_level: measure,
  total_body_water_l: measure,
  bmr_kcal: measure,
  inbody_score: measure,
  protein_kg: measure,
  minerals_kg: measure,
  bone_mineral_kg: measure,
  soft_lean_mass_kg: measure,
  fat_free_mass_kg: measure,
  body_cell_mass_kg: measure,
  ecw_ratio: measure,
  phase_angle: measure,
  smi: measure,
  visceral_fat_area_cm2: measure,
  waist_circumference_cm: measure,
  waist_hip_ratio: measure,
  obesity_degree_pct: measure,
  recommended_kcal: measure,
  target_weight_kg: measure,
  weight_control_kg: z.number().min(-500).max(500).nullable(),
  fat_control_kg: z.number().min(-500).max(500).nullable(),
  muscle_control_kg: z.number().min(-500).max(500).nullable(),
  segmental: z.string().nullable(),
  notes: z.string().max(500).nullable(),
});

export async function commitInbodyScan(input: unknown): Promise<void> {
  const user = await requireUser();
  const { taken_at, ...data } = scanInput.parse(input);

  const takenAt = new Date(taken_at);
  if (Number.isNaN(takenAt.getTime())) throw new Error("Invalid scan date");

  await db.insert(body_scans).values({
    id: randomUUID(),
    user_id: user.id,
    taken_at: takenAt,
    created_at: new Date(),
    ...data,
  });
  revalidatePath("/settings");
  revalidatePath("/");
}
