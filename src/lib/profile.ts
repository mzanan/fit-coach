import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { cache } from "react";

import { isChatLanguage } from "@/lib/constants";
import { db, schema } from "@/lib/db";
import type { Profile } from "@/lib/db/schema";
import { SEED_CATALOG } from "@/lib/seedData";
import { newId } from "@/lib/utils";

const { profiles, catalog_items, catalog_components } = schema;

export async function detectChatLanguage(
  userId: string,
  language: unknown,
): Promise<void> {
  const value = typeof language === "string" ? language.trim() : "";
  if (!isChatLanguage(value)) return;
  try {
    await db
      .update(profiles)
      .set({ chat_language: value, updated_at: new Date() })
      .where(
        and(eq(profiles.user_id, userId), isNull(profiles.chat_language)),
      );
  } catch (err) {
    console.error(
      "profile: saving detected chat language failed",
      err instanceof Error ? err.message : err,
    );
  }
}

export const ensureProfile = cache(
  async (userId: string): Promise<Profile> => {
    const existing = await db
      .select()
      .from(profiles)
      .where(eq(profiles.user_id, userId))
      .limit(1);
    if (existing[0]) return existing[0];

    const now = new Date();
    const inserted = await db
      .insert(profiles)
      .values({ user_id: userId, created_at: now, updated_at: now })
      .onConflictDoNothing()
      .returning();

    if (inserted.length > 0) {
      await seedCatalog(userId);
      await db
        .update(profiles)
        .set({ seeded_at: new Date() })
        .where(eq(profiles.user_id, userId));
    }

    const row = await db
      .select()
      .from(profiles)
      .where(eq(profiles.user_id, userId))
      .limit(1);
    return row[0];
  },
);

async function seedCatalog(userId: string): Promise<void> {
  const now = new Date();
  for (const item of SEED_CATALOG) {
    const itemId = newId();
    await db.insert(catalog_items).values({
      id: itemId,
      user_id: userId,
      name: item.name,
      place: item.place ?? null,
      protein_g: item.protein_g,
      fat_g: item.fat_g,
      carbs_g: item.carbs_g,
      fat_quality: item.fat_quality ?? null,
      notes: item.notes ?? null,
      is_composable: item.is_composable,
      created_at: now,
      updated_at: now,
    });
    if (item.components?.length) {
      await db.insert(catalog_components).values(
        item.components.map((c, i) => ({
          id: newId(),
          item_id: itemId,
          user_id: userId,
          name: c.name,
          group_name: c.group_name,
          protein_g: c.protein_g,
          fat_g: c.fat_g,
          carbs_g: c.carbs_g,
          fat_quality: c.fat_quality ?? null,
          sort: i,
        })),
      );
    }
  }
}
