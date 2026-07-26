"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  canExtractInbody,
  extractInbody,
  type InbodyExtraction,
} from "@/lib/ai/inbody";
import {
  INBODY_NUMERIC_KEYS,
  INBODY_TEXT_KEYS,
  type Segmental,
} from "@/lib/constants";
import { db, schema } from "@/lib/db";
import { toModelDataUrl } from "@/lib/imageNormalize";
import { verifyScan, type ScanVerification } from "@/lib/inbodyChecks";
import { requireUser } from "@/lib/session";

const { body_scans } = schema;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const measure = z.number().min(0).max(10000).nullable();
const control = z.number().min(-500).max(500).nullable();

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
  weight_control_kg: control,
  fat_control_kg: control,
  muscle_control_kg: control,
  segmental: z.string().nullable(),
  notes: z.string().max(500).nullable(),
});

type ScanInput = z.infer<typeof scanInput>;

export interface SavedScan {
  taken_at: string;
  fieldCount: number;
  checksPassed: number;
  weight_kg: number | null;
  body_fat_pct: number | null;
  skeletal_muscle_kg: number | null;
  inbody_score: number | null;
}

export type InbodyImportResult =
  | { status: "saved"; saved: SavedScan }
  | {
      status: "review";
      extraction: InbodyExtraction;
      image: string;
      verification: ScanVerification;
      reason: string;
    };

async function insertScan(userId: string, data: ScanInput): Promise<void> {
  const { taken_at, ...rest } = data;
  const takenAt = new Date(taken_at);
  if (Number.isNaN(takenAt.getTime())) throw new Error("Invalid scan date");

  await db.insert(body_scans).values({
    id: randomUUID(),
    user_id: userId,
    taken_at: takenAt,
    created_at: new Date(),
    ...rest,
  });
  revalidatePath("/settings");
  revalidatePath("/");
}

function toScanInput(x: InbodyExtraction, takenAt: string): ScanInput {
  const record = x as unknown as Record<string, unknown>;
  const numbers = Object.fromEntries(
    INBODY_NUMERIC_KEYS.map((key) => [
      key,
      typeof record[key] === "number" ? (record[key] as number) : null,
    ]),
  );
  const texts = Object.fromEntries(
    INBODY_TEXT_KEYS.map((key) => [
      key,
      typeof record[key] === "string" && record[key] !== ""
        ? (record[key] as string)
        : null,
    ]),
  );
  return scanInput.parse({
    taken_at: takenAt,
    notes: null,
    segmental: x.segmental ? JSON.stringify(x.segmental) : null,
    ...numbers,
    ...texts,
  });
}

function countFields(data: ScanInput): number {
  return Object.entries(data).filter(
    ([key, value]) => key !== "taken_at" && value !== null,
  ).length;
}

export async function importInbodyScan(
  formData: FormData,
): Promise<InbodyImportResult> {
  const user = await requireUser();
  if (!canExtractInbody()) throw new Error("AI key is not configured");

  const file = formData.get("image");
  if (!(file instanceof File)) throw new Error("No image received");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image too large (max 8 MB)");

  const image = await toModelDataUrl(file);
  const extraction = await extractInbody(image);
  const verification = verifyScan(
    extraction as unknown as Record<string, number | null | undefined>,
    (extraction.segmental as Segmental | null) ?? null,
  );

  const takenAt = extraction.test_datetime?.slice(0, 16).replace(" ", "T") ?? "";
  if (!takenAt || Number.isNaN(new Date(takenAt).getTime())) {
    return {
      status: "review",
      extraction,
      image,
      verification,
      reason: "The scan date could not be read, so nothing was saved yet.",
    };
  }

  if (!verification.ok) {
    return {
      status: "review",
      extraction,
      image,
      verification,
      reason: verification.failed.length
        ? `These values do not add up: ${verification.failed.map((c) => c.label).join("; ")}.`
        : "Not enough values could be cross-checked, so please confirm them.",
    };
  }

  const data = toScanInput(extraction, takenAt);
  await insertScan(user.id, data);

  return {
    status: "saved",
    saved: {
      taken_at: takenAt,
      fieldCount: countFields(data),
      checksPassed: verification.passed.length,
      weight_kg: data.weight_kg,
      body_fat_pct: data.body_fat_pct,
      skeletal_muscle_kg: data.skeletal_muscle_kg,
      inbody_score: data.inbody_score,
    },
  };
}

export async function commitInbodyScan(input: unknown): Promise<void> {
  const user = await requireUser();
  await insertScan(user.id, scanInput.parse(input));
}
