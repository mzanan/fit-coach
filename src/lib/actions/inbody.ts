"use server";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
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

export type ScanInput = z.infer<typeof scanInput>;

export interface SavedScan {
  taken_at: string;
  fieldCount: number;
  checksPassed: number;
  weight_kg: number | null;
  body_fat_pct: number | null;
  skeletal_muscle_kg: number | null;
  inbody_score: number | null;
}

export interface ExistingScan {
  id: string;
  taken_at: string;
  imported_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  skeletal_muscle_kg: number | null;
}

export type InbodyImportResult =
  | { status: "saved"; saved: SavedScan }
  | {
      status: "duplicate";
      pending: ScanInput;
      existing: ExistingScan;
      checksPassed: number;
    }
  | {
      status: "review";
      extraction: InbodyExtraction;
      image: string;
      verification: ScanVerification;
      reason: string;
    };

function scanDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid scan date");
  return date;
}

async function findExistingScan(
  userId: string,
  takenAt: Date,
): Promise<ExistingScan | null> {
  const rows = await db
    .select()
    .from(body_scans)
    .where(and(eq(body_scans.user_id, userId), eq(body_scans.taken_at, takenAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    taken_at: row.taken_at.toISOString(),
    imported_at: row.created_at.toISOString(),
    weight_kg: row.weight_kg,
    body_fat_pct: row.body_fat_pct,
    skeletal_muscle_kg: row.skeletal_muscle_kg,
  };
}

async function insertScan(userId: string, data: ScanInput): Promise<void> {
  const { taken_at, ...rest } = data;

  await db.insert(body_scans).values({
    id: randomUUID(),
    user_id: userId,
    taken_at: scanDate(taken_at),
    created_at: new Date(),
    ...rest,
  });
  revalidatePath("/settings");
  revalidatePath("/");
}

async function replaceScan(
  userId: string,
  scanId: string,
  data: ScanInput,
): Promise<void> {
  const { taken_at, ...rest } = data;

  await db
    .update(body_scans)
    .set({ taken_at: scanDate(taken_at), ...rest })
    .where(and(eq(body_scans.id, scanId), eq(body_scans.user_id, userId)));
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

function friendlyExtractionError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  if (raw.startsWith("ai 429")) {
    return "The AI provider rate limit was hit. Wait a minute and try again.";
  }
  if (raw.startsWith("ai 401") || raw.startsWith("ai 403")) {
    return "The AI provider rejected the vision key. Check AI_VISION_API_KEY matches AI_VISION_BASE_URL.";
  }
  if (raw.startsWith("ai 4")) {
    return "The AI provider rejected the request. Check AI_VISION_MODEL matches the provider behind AI_VISION_BASE_URL.";
  }
  if (raw.startsWith("ai 5")) {
    return "The AI provider is having trouble. Try again in a moment.";
  }
  return "The sheet could not be read. Try a clearer, closer photo.";
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
  let extraction: InbodyExtraction;
  try {
    extraction = await extractInbody(image);
  } catch (error) {
    throw new Error(friendlyExtractionError(error));
  }
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
  const existing = await findExistingScan(user.id, scanDate(takenAt));
  if (existing) {
    return {
      status: "duplicate",
      pending: data,
      existing,
      checksPassed: verification.passed.length,
    };
  }

  await insertScan(user.id, data);
  return { status: "saved", saved: toSavedScan(data, verification.passed.length) };
}

function toSavedScan(data: ScanInput, checksPassed: number): SavedScan {
  return {
    taken_at: data.taken_at,
    fieldCount: countFields(data),
    checksPassed,
    weight_kg: data.weight_kg,
    body_fat_pct: data.body_fat_pct,
    skeletal_muscle_kg: data.skeletal_muscle_kg,
    inbody_score: data.inbody_score,
  };
}

export async function resolveInbodyDuplicate(
  input: unknown,
  mode: "replace" | "new",
  scanId?: string,
): Promise<SavedScan> {
  const user = await requireUser();
  const data = scanInput.parse(input);

  if (mode === "replace") {
    if (!scanId) throw new Error("Missing the scan to replace");
    await replaceScan(user.id, scanId, data);
  } else {
    await insertScan(user.id, data);
  }
  return toSavedScan(data, 0);
}

export type CommitResult =
  | { status: "saved"; saved: SavedScan }
  | { status: "duplicate"; pending: ScanInput; existing: ExistingScan };

export async function commitInbodyScan(input: unknown): Promise<CommitResult> {
  const user = await requireUser();
  const data = scanInput.parse(input);

  const existing = await findExistingScan(user.id, scanDate(data.taken_at));
  if (existing) return { status: "duplicate", pending: data, existing };

  await insertScan(user.id, data);
  return { status: "saved", saved: toSavedScan(data, 0) };
}
