"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/session";

const { profiles } = schema;

const targetsSchema = z.object({
  protein_target: z.number().min(0).max(500),
  fat_min: z.number().min(0).max(300),
  fat_max: z.number().min(0).max(300),
  fat_floor: z.number().min(0).max(300),
  carbs_gym: z.number().min(0).max(1000),
  carbs_rest: z.number().min(0).max(1000),
  calories_target: z.number().min(0).max(10000),
});

export async function updateTargets(input: unknown) {
  const user = await requireUser();
  const data = targetsSchema.parse(input);

  await db
    .update(profiles)
    .set({ ...data, updated_at: new Date() })
    .where(eq(profiles.user_id, user.id));
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/settings/targets");
}

const settingsSchema = z.object({
  sex: z.enum(["male", "female"]),
  birth_year: z.number().int().min(1900).max(2100).nullable(),
  height_cm: z.number().min(0).max(300).nullable(),
  timezone: z.string().min(1),
  day_cutoff_hour: z.number().int().min(0).max(12),
});

export async function updateProfileSettings(input: unknown) {
  const user = await requireUser();
  const data = settingsSchema.parse(input);

  await db
    .update(profiles)
    .set({ ...data, updated_at: new Date() })
    .where(eq(profiles.user_id, user.id));
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/settings/profile");
}
