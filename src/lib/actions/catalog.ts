"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  componentGroup,
  fatQuality,
  macroFields,
  optionalMacroFields,
} from "@/lib/validation";
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
  ...optionalMacroFields,
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
    protein_g: data.protein_g ?? null,
    fat_g: data.fat_g ?? null,
    carbs_g: data.carbs_g ?? null,
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
      protein_g: data.protein_g ?? null,
      fat_g: data.fat_g ?? null,
      carbs_g: data.carbs_g ?? null,
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

const idsSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });

export async function bulkArchiveCatalogItems(
  input: unknown,
): Promise<{ count: number }> {
  const user = await requireUser();
  const { ids } = idsSchema.parse(input);
  const rows = await db
    .update(catalog_items)
    .set({ archived: true, updated_at: new Date() })
    .where(
      and(inArray(catalog_items.id, ids), eq(catalog_items.user_id, user.id)),
    )
    .returning({ id: catalog_items.id });
  revalidateCatalog();
  return { count: rows.length };
}

export async function bulkDeleteCatalogItems(
  input: unknown,
): Promise<{ count: number }> {
  const user = await requireUser();
  const { ids } = idsSchema.parse(input);
  await db
    .delete(catalog_components)
    .where(
      and(
        inArray(catalog_components.item_id, ids),
        eq(catalog_components.user_id, user.id),
      ),
    );
  const rows = await db
    .delete(catalog_items)
    .where(
      and(inArray(catalog_items.id, ids), eq(catalog_items.user_id, user.id)),
    )
    .returning({ id: catalog_items.id });
  revalidateCatalog();
  return { count: rows.length };
}

const clearModeSchema = z.object({ mode: z.enum(["archive", "delete"]) });

export async function clearCatalog(
  input: unknown,
): Promise<{ count: number }> {
  const user = await requireUser();
  const { mode } = clearModeSchema.parse(input);
  const scope = and(
    eq(catalog_items.user_id, user.id),
    eq(catalog_items.archived, false),
  );
  if (mode === "archive") {
    const rows = await db
      .update(catalog_items)
      .set({ archived: true, updated_at: new Date() })
      .where(scope)
      .returning({ id: catalog_items.id });
    revalidateCatalog();
    return { count: rows.length };
  }

  const targets = await db
    .select({ id: catalog_items.id })
    .from(catalog_items)
    .where(scope);
  const ids = targets.map((t) => t.id);
  if (ids.length) {
    await db
      .delete(catalog_components)
      .where(
        and(
          inArray(catalog_components.item_id, ids),
          eq(catalog_components.user_id, user.id),
        ),
      );
  }
  const rows = await db
    .delete(catalog_items)
    .where(scope)
    .returning({ id: catalog_items.id });
  revalidateCatalog();
  return { count: rows.length };
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
