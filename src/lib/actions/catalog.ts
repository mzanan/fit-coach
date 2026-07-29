"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { componentGroup, fatQuality, macroFields } from "@/lib/validation";
import { newId } from "@/lib/utils";

const { catalog_items, catalog_components } = schema;

function revalidateCatalog() {
  updateTag("catalog");
  revalidatePath("/catalog");
  revalidatePath("/");
}

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
  revalidateCatalog();
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
  revalidateCatalog();
}

export async function archiveCatalogItem(id: string) {
  const user = await requireUser();
  await db
    .update(catalog_items)
    .set({ archived: true, updated_at: new Date() })
    .where(and(eq(catalog_items.id, id), eq(catalog_items.user_id, user.id)));
  revalidateCatalog();
}

const componentSchema = z.object({
  name: z.string().min(1),
  group_name: componentGroup,
  fat_quality: fatQuality.optional(),
  ...macroFields,
});

export async function createCatalogComponent(input: unknown) {
  const user = await requireUser();
  const data = componentSchema.extend({ item_id: z.string().min(1) }).parse(input);

  const item = await db
    .select({ id: catalog_items.id })
    .from(catalog_items)
    .where(
      and(
        eq(catalog_items.id, data.item_id),
        eq(catalog_items.user_id, user.id),
        eq(catalog_items.is_composable, true),
      ),
    )
    .limit(1);
  if (!item[0]) throw new Error("Not found");

  const existing = await db
    .select({ id: catalog_components.id })
    .from(catalog_components)
    .where(eq(catalog_components.item_id, data.item_id));

  await db.insert(catalog_components).values({
    id: newId(),
    item_id: data.item_id,
    user_id: user.id,
    name: data.name.trim(),
    group_name: data.group_name,
    protein_g: data.protein_g,
    fat_g: data.fat_g,
    carbs_g: data.carbs_g,
    fat_quality: data.fat_quality ?? null,
    sort: existing.length,
  });
  revalidateCatalog();
}

export async function updateCatalogComponent(input: unknown) {
  const user = await requireUser();
  const data = componentSchema.extend({ id: z.string().min(1) }).parse(input);

  await db
    .update(catalog_components)
    .set({
      name: data.name.trim(),
      group_name: data.group_name,
      protein_g: data.protein_g,
      fat_g: data.fat_g,
      carbs_g: data.carbs_g,
      fat_quality: data.fat_quality ?? null,
    })
    .where(
      and(eq(catalog_components.id, data.id), eq(catalog_components.user_id, user.id)),
    );
  revalidateCatalog();
}

export async function deleteCatalogComponent(id: string) {
  const user = await requireUser();
  await db
    .delete(catalog_components)
    .where(and(eq(catalog_components.id, id), eq(catalog_components.user_id, user.id)));
  revalidateCatalog();
}
