import "server-only";

import { and, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Profile } from "@/lib/db/schema";
import { ensureDay } from "@/lib/data/days";
import { resolveDayType } from "@/lib/dayType";
import { newId } from "@/lib/utils";

const { days, routine_slots } = schema;

export interface DayFieldsInput {
  day: string;
  steps?: number | null;
  notes?: string | null;
  day_type?: "gym" | "rest";
  closed?: boolean;
}

export async function setDayFields(
  userId: string,
  profile: Profile,
  today: string,
  input: DayFieldsInput,
) {
  if (input.day === today) await ensureDay(userId, profile, today);
  return db.transaction(async (tx) => {
    const slots = await tx
      .select({ weekday: routine_slots.weekday })
      .from(routine_slots)
      .where(eq(routine_slots.user_id, userId));
    await tx
      .insert(days)
      .values({
        id: newId(),
        user_id: userId,
        logical_day: input.day,
        day_type: input.day_type ?? resolveDayType({ dayRow: null, slots, day: input.day }),
        created_at: new Date(),
      })
      .onConflictDoNothing({ target: [days.user_id, days.logical_day] });
    const patch = {
      ...(input.steps !== undefined ? { steps: input.steps } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.day_type ? { day_type: input.day_type } : {}),
      ...(input.closed !== undefined ? { closed_at: input.closed ? new Date() : null } : {}),
    };
    const where = and(eq(days.user_id, userId), eq(days.logical_day, input.day));
    if (Object.keys(patch).length) await tx.update(days).set(patch).where(where);
    const [row] = await tx.select().from(days).where(where).limit(1);
    return row;
  });
}
