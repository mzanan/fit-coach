import "server-only";

import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Profile } from "@/lib/db/schema";
import type { ProfileUpdate } from "@/lib/history/manageSchemas";

const { profiles } = schema;

export async function updateProfileFields(
  userId: string,
  fields: ProfileUpdate | Pick<Profile, "current_location">,
) {
  const [row] = await db
    .update(profiles)
    .set({ ...fields, updated_at: new Date() })
    .where(eq(profiles.user_id, userId))
    .returning();
  return row ?? null;
}
