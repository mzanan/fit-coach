"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { fatQuality, macroFields } from "@/lib/validation";
import { newId } from "@/lib/utils";

const { catalog_items } = schema;

const createSchema = z.object({
  name: z.string().min(1),
  place: z.string().optional(),
  notes: z.string().optional(),
  fat_quality: fatQuality.optional(),
  ...macroFields,
});

export async function createCatalogItem(input: unknown) {
  const user = await requireUser();
  const data = createSchema.parse(input);
  const now = new Date();

  await db.insert(catalog_items).values({
    id: newId(),
    user_id: user.id,
    name: data.name.trim(),
    place: data.place?.trim() || null,
    notes: data.notes?.trim() || null,
    protein_g: data.protein_g,
    fat_g: data.fat_g,
    carbs_g: data.carbs_g,
    fat_quality: data.fat_quality ?? null,
    is_composable: false,
    created_at: now,
    updated_at: now,
  });
  updateTag("catalog");
  revalidatePath("/catalog");
  revalidatePath("/");
}

const updateSchema = createSchema.extend({ id: z.string().min(1) });

export async function updateCatalogItem(input: unknown) {
  const user = await requireUser();
  const data = updateSchema.parse(input);

  await db
    .update(catalog_items)
    .set({
      name: data.name.trim(),
      place: data.place?.trim() || null,
      notes: data.notes?.trim() || null,
      protein_g: data.protein_g,
      fat_g: data.fat_g,
      carbs_g: data.carbs_g,
      fat_quality: data.fat_quality ?? null,
      updated_at: new Date(),
    })
    .where(
      and(eq(catalog_items.id, data.id), eq(catalog_items.user_id, user.id)),
    );
  updateTag("catalog");
  revalidatePath("/catalog");
  revalidatePath("/");
}

export async function archiveCatalogItem(id: string) {
  const user = await requireUser();
  await db
    .update(catalog_items)
    .set({ archived: true, updated_at: new Date() })
    .where(and(eq(catalog_items.id, id), eq(catalog_items.user_id, user.id)));
  updateTag("catalog");
  revalidatePath("/catalog");
}
