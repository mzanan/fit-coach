"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { closeOrUpdateDay } from "@/lib/data/days";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

const closeDaySchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  steps: z.number().int().min(0).max(100000).nullable(),
  notes: z.string().trim().max(500).nullable(),
});

export async function closeDayAction(input: unknown): Promise<void> {
  const user = await requireUser();
  const data = closeDaySchema.parse(input);
  const profile = await ensureProfile(user.id);

  await closeOrUpdateDay(user.id, profile, data.day, {
    steps: data.steps,
    notes: data.notes,
  });

  revalidatePath("/");
}
