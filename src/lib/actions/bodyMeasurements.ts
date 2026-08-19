"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { saveMeasurement } from "@/lib/data/bodyMeasurements";
import { dayConfig, todayLogicalDay } from "@/lib/dates";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { measurementValue } from "@/lib/validation";

const logSchema = z
  .object({
    waist: measurementValue.nullish(),
    weight: measurementValue.nullish(),
  })
  .refine((data) => data.waist != null || data.weight != null, {
    message: "Enter at least one measurement",
  });

export interface LogMeasurementsResult {
  error?: string;
}

export async function logMeasurements(
  input: unknown,
): Promise<LogMeasurementsResult> {
  const user = await requireUser();
  const parsed = logSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter a valid waist or weight value" };
  }

  const profile = await ensureProfile(user.id);
  const today = todayLogicalDay(dayConfig(profile));
  const { waist, weight } = parsed.data;

  await Promise.all([
    waist != null
      ? saveMeasurement(user.id, { type: "waist", value: waist, logical_day: today })
      : null,
    weight != null
      ? saveMeasurement(user.id, { type: "weight", value: weight, logical_day: today })
      : null,
  ]);

  revalidatePath("/body");
  return {};
}
