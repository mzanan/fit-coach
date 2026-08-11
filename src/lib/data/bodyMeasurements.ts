import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { newId } from "@/lib/utils";

const { body_measurements } = schema;

export interface BodyMeasurementInput {
  type: string;
  value: number | null;
  logical_day: string;
}

export interface LatestMeasurement {
  value: number | null;
  logical_day: string;
}

export async function saveMeasurement(
  userId: string,
  input: BodyMeasurementInput,
): Promise<void> {
  await db.insert(body_measurements).values({
    id: newId(),
    user_id: userId,
    type: input.type,
    value: input.value,
    logical_day: input.logical_day,
    created_at: new Date(),
  });
}

export async function getLatestMeasurement(
  userId: string,
  type: string,
): Promise<LatestMeasurement | null> {
  const [row] = await db
    .select({
      value: body_measurements.value,
      logical_day: body_measurements.logical_day,
    })
    .from(body_measurements)
    .where(
      and(
        eq(body_measurements.user_id, userId),
        eq(body_measurements.type, type),
      ),
    )
    .orderBy(desc(body_measurements.logical_day), desc(body_measurements.created_at))
    .limit(1);
  return row ?? null;
}
