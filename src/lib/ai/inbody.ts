import "server-only";

import { z } from "zod";

import { chatJsonVision, hasVisionAi } from "@/lib/ai/provider";
import { INBODY_NUMERIC_KEYS } from "@/lib/constants";

const SYSTEM = `You read InBody body-composition result sheets (printed paper or on-screen). Extract ONLY values that are clearly legible in the image. Never guess, never compute derived values yourself: if a field is not readable or not present, return null for it. Numbers use the units printed on the sheet; convert lb to kg only when the sheet is in pounds. Return strict JSON.`;

const PROMPT = `Extract EVERY value printed on this InBody sheet as JSON:
{
  "test_datetime": "YYYY-MM-DD HH:mm or null",
  "device": "e.g. InBody580, or null",
  "location": "gym or clinic name, or null",
  "member_id": "the ID printed in the header, digits and masking exactly as shown, or null",
  "height_cm": number|null,
  "age": number|null,
  "gender": "male|female|null",
  "body_balance_upper": "balanced|slightly unbalanced|extremely unbalanced|null",
  "body_balance_lower": "same options",
  "body_balance_upper_lower": "same options",
  "weight_kg": number|null,
  "skeletal_muscle_kg": number|null,
  "body_fat_kg": number|null,
  "body_fat_pct": number|null,
  "bmi": number|null,
  "visceral_fat_level": number|null,
  "total_body_water_l": number|null,
  "bmr_kcal": number|null,
  "inbody_score": number|null,
  "protein_kg": number|null,
  "minerals_kg": number|null,
  "bone_mineral_kg": number|null,
  "soft_lean_mass_kg": number|null,
  "fat_free_mass_kg": number|null,
  "body_cell_mass_kg": number|null,
  "ecw_ratio": number|null,
  "phase_angle": number|null,
  "smi": number|null,
  "visceral_fat_area_cm2": number|null,
  "waist_circumference_cm": number|null,
  "waist_hip_ratio": number|null,
  "obesity_degree_pct": number|null,
  "recommended_kcal": number|null,
  "target_weight_kg": number|null,
  "weight_control_kg": number|null,
  "fat_control_kg": number|null,
  "muscle_control_kg": number|null,
  "segmental": {
    "right_arm": { "lean_kg": number|null, "lean_pct": number|null, "fat_kg": number|null, "fat_pct": number|null, "ecw_ratio": number|null, "phase_angle": number|null },
    "left_arm": { same keys },
    "trunk": { same keys },
    "right_leg": { same keys },
    "left_leg": { same keys }
  },
  "absent": ["field names that this sheet does not print at all"],
  "illegible": ["field names printed on the sheet but that you could not read"],
  "warnings": ["only real problems a human must double check"]
}

Return only those keys, nothing else. Always include all five segments and all six segmental keys, using null where the sheet lacks them. Every top-level field you return as null MUST appear in exactly one of "absent" or "illegible", so the user knows whether the sheet lacks it or the image failed.

"warnings" is for problems only: a digit you are unsure of, a value that contradicts another, an unexpected unit, a label whose meaning is genuinely doubtful. When the sheet is standard and readable, return an EMPTY warnings array. Never write a warning just to describe which labels the sheet used or to confirm that something is normal or as expected. Small decimals like minerals (4.63) and segmental lean mass (10.96) are easy to misread, so flag any digit you are not certain of.

Where to look: the header has the ID, height, age, gender, test date, device model and often the gym name. Body Balance Evaluation has the upper, lower and upper-lower verdicts, read whichever checkbox is ticked. Body Composition Analysis has total body water, protein, minerals, body fat mass, soft lean mass, fat free mass. Muscle-Fat Analysis has weight, SMM, body fat mass. Obesity Analysis has BMI and PBF. Segmental Lean Analysis has per-segment lean kg and percent, and often a per-segment ECW ratio and phase angle column. Segmental Fat Analysis has per-segment fat kg and percent. Research Parameters has SMM, BMR, waist-hip ratio, waist circumference, visceral fat level, obesity degree, bone mineral content, body cell mass, SMI and recommended calorie intake. Weight Control has target weight and the weight, fat and muscle control values, which are often 0.0.

InBody prints the test date day first, as DD.MM.YYYY or DD.MM.YY: both 22.07.2026 and 22.07.26 mean 2026-07-22, never 2022-07-26.

InBody sheets sometimes print "Muscle Mass" instead of "Skeletal Muscle Mass" (SMM): map either to skeletal_muscle_kg, and warn ONLY in that non-SMM case (say nothing when the label is the usual SMM or PBF). The ECW ratio (around 0.38) is never total_body_water_l, which is in litres.`;

const num = z.number().nullable().optional();
const text = z.string().nullable().optional();

const segment = z
  .object({
    lean_kg: num,
    lean_pct: num,
    fat_kg: num,
    fat_pct: num,
    ecw_ratio: num,
    phase_angle: num,
  })
  .nullable()
  .optional();

const extraction = z.object({
  test_datetime: text,
  device: text,
  location: text,
  member_id: text,
  height_cm: num,
  age: num,
  gender: text,
  body_balance_upper: text,
  body_balance_lower: text,
  body_balance_upper_lower: text,
  weight_kg: num,
  skeletal_muscle_kg: num,
  body_fat_kg: num,
  body_fat_pct: num,
  bmi: num,
  visceral_fat_level: num,
  total_body_water_l: num,
  bmr_kcal: num,
  inbody_score: num,
  protein_kg: num,
  minerals_kg: num,
  bone_mineral_kg: num,
  soft_lean_mass_kg: num,
  fat_free_mass_kg: num,
  body_cell_mass_kg: num,
  ecw_ratio: num,
  phase_angle: num,
  smi: num,
  visceral_fat_area_cm2: num,
  waist_circumference_cm: num,
  waist_hip_ratio: num,
  obesity_degree_pct: num,
  recommended_kcal: num,
  target_weight_kg: num,
  weight_control_kg: num,
  fat_control_kg: num,
  muscle_control_kg: num,
  segmental: z
    .object({
      right_arm: segment,
      left_arm: segment,
      trunk: segment,
      right_leg: segment,
      left_leg: segment,
    })
    .nullable()
    .optional(),
  absent: z.array(z.string()).optional(),
  illegible: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
});

export type InbodyExtraction = z.infer<typeof extraction>;

export function canExtractInbody(): boolean {
  return hasVisionAi();
}

const RETRY_KEYS = INBODY_NUMERIC_KEYS;

function missingKeys(result: InbodyExtraction): string[] {
  const record = result as unknown as Record<string, unknown>;
  return RETRY_KEYS.filter((key) => record[key] == null);
}

function secondLookPrompt(keys: string[]): string {
  return `Look at this InBody sheet again. A first pass could not find these fields: ${keys.join(", ")}.

They are very likely printed somewhere on the sheet, so search carefully: the Research Parameters block on the right lists waist-hip ratio, waist circumference, obesity degree, bone mineral content, body cell mass, SMI, BMR and visceral fat level; the header carries height and age; Weight Control lists target weight and the control values, often 0.0; Body Composition Analysis lists total body water, protein, minerals, soft lean mass and fat free mass.

Return JSON with exactly these keys: ${keys.join(", ")}, plus "still_missing" listing the ones that genuinely are not on this sheet or cannot be read. Give a number only when you can actually read it, null otherwise. Do not compute or infer any value.`;
}

export async function extractInbody(
  imageDataUrl: string,
): Promise<InbodyExtraction> {
  const first = extraction.parse(
    await chatJsonVision<unknown>(SYSTEM, PROMPT, imageDataUrl, 3000),
  );
  const missing = missingKeys(first);
  console.log("[inbody] first pass missing", missing.length ? missing : "none");
  if (!missing.length) return first;

  try {
    const second = await chatJsonVision<Record<string, unknown>>(
      SYSTEM,
      secondLookPrompt(missing),
      imageDataUrl,
      800,
    );
    const recovered = extraction.partial().parse(second);
    const patch = Object.fromEntries(
      missing
        .map((key) => [key, (recovered as Record<string, unknown>)[key]])
        .filter(([, value]) => value != null),
    );
    const keys = Object.keys(patch);
    if (!keys.length) return first;

    return {
      ...first,
      ...patch,
      absent: (first.absent ?? []).filter((k) => !keys.includes(k)),
      illegible: (first.illegible ?? []).filter((k) => !keys.includes(k)),
    };
  } catch {
    return first;
  }
}
