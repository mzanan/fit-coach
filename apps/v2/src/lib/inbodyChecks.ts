import { BODY_SEGMENTS, type Segmental } from "@/lib/constants";

export interface ScanCheck {
  label: string;
  fields: string[];
  expected: number;
  actual: number;
  tolerance: number;
  ok: boolean;
}

export interface ScanVerification {
  ok: boolean;
  passed: ScanCheck[];
  failed: ScanCheck[];
  suspectFields: string[];
}

type Values = Record<string, number | null | undefined>;

function check(
  label: string,
  fields: string[],
  actual: number | null | undefined,
  expected: number | null,
  tolerance: number,
): ScanCheck | null {
  if (actual == null || expected == null || !Number.isFinite(expected)) return null;
  return {
    label,
    fields,
    expected: Math.round(expected * 100) / 100,
    actual,
    tolerance,
    ok: Math.abs(actual - expected) <= tolerance,
  };
}

function appendicularLean(segmental: Segmental | null): number | null {
  if (!segmental) return null;
  const values: number[] = [];
  for (const limb of BODY_SEGMENTS) {
    if (limb.key === "trunk") continue;
    const lean = segmental[limb.key]?.lean_kg;
    if (lean == null) return null;
    values.push(lean);
  }
  return values.reduce((total, lean) => total + lean, 0);
}

export function verifyScan(
  values: Values,
  segmental: Segmental | null,
): ScanVerification {
  const heightM = values.height_cm ? values.height_cm / 100 : null;
  const asmm = appendicularLean(segmental);

  const candidates = [
    check(
      "body fat percent matches fat mass over weight",
      ["body_fat_pct", "body_fat_kg", "weight_kg"],
      values.body_fat_pct,
      values.body_fat_kg != null && values.weight_kg
        ? (values.body_fat_kg / values.weight_kg) * 100
        : null,
      0.4,
    ),
    check(
      "weight matches fat free mass plus fat mass",
      ["weight_kg", "fat_free_mass_kg", "body_fat_kg"],
      values.weight_kg,
      values.fat_free_mass_kg != null && values.body_fat_kg != null
        ? values.fat_free_mass_kg + values.body_fat_kg
        : null,
      0.4,
    ),
    check(
      "BMI matches weight over height squared",
      ["bmi", "weight_kg", "height_cm"],
      values.bmi,
      values.weight_kg && heightM ? values.weight_kg / (heightM * heightM) : null,
      0.4,
    ),
    check(
      "weight matches water plus protein plus minerals plus fat",
      [
        "weight_kg",
        "total_body_water_l",
        "protein_kg",
        "minerals_kg",
        "body_fat_kg",
      ],
      values.weight_kg,
      values.total_body_water_l != null &&
        values.protein_kg != null &&
        values.minerals_kg != null &&
        values.body_fat_kg != null
        ? values.total_body_water_l +
            values.protein_kg +
            values.minerals_kg +
            values.body_fat_kg
        : null,
      0.6,
    ),
    check(
      "SMI matches limb lean mass over height squared",
      ["smi", "height_cm"],
      values.smi,
      asmm != null && heightM ? asmm / (heightM * heightM) : null,
      0.4,
    ),
    check(
      "skeletal muscle fits inside fat free mass",
      ["skeletal_muscle_kg", "fat_free_mass_kg"],
      values.fat_free_mass_kg != null && values.skeletal_muscle_kg != null
        ? Number(values.fat_free_mass_kg > values.skeletal_muscle_kg)
        : null,
      1,
      0,
    ),
  ].filter((c): c is ScanCheck => c !== null);

  const passed = candidates.filter((c) => c.ok);
  const failed = candidates.filter((c) => !c.ok);

  return {
    ok: failed.length === 0 && passed.length >= 3,
    passed,
    failed,
    suspectFields: [...new Set(failed.flatMap((c) => c.fields))],
  };
}
