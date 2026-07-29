import "server-only";

import { and, eq, notInArray, or, sql, type SQL } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { EXERCISE_EQUIPMENT_KNOWN, EXERCISE_EQUIPMENT_OTHER } from "@/lib/constants";

const { exercise_catalog } = schema;

export const EXERCISE_SEARCH_PAGE_SIZE = 20;

export interface ExerciseCatalogOption {
  id: string;
  name: string;
  gif_path: string;
  equipment: string | null;
  target: string | null;
}

export interface ExerciseSearchResult {
  items: ExerciseCatalogOption[];
  hasMore: boolean;
  total: number;
}

export interface ExerciseSearchParams {
  query?: string;
  target?: string;
  equipment?: string;
  offset?: number;
}

export async function findExerciseByName(
  name: string,
): Promise<ExerciseCatalogOption | null> {
  const value = name.trim().toLowerCase();
  if (value === "") return null;

  const rows = await db
    .select({
      id: exercise_catalog.id,
      name: exercise_catalog.name,
      gif_path: exercise_catalog.gif_path,
      equipment: exercise_catalog.equipment,
      target: exercise_catalog.target,
    })
    .from(exercise_catalog)
    .where(sql`lower(${exercise_catalog.name}) = ${value}`)
    .orderBy(exercise_catalog.id)
    .limit(1);

  return rows[0] ?? null;
}

export async function searchExerciseCatalog({
  query,
  target,
  equipment,
  offset = 0,
}: ExerciseSearchParams): Promise<ExerciseSearchResult> {
  const q = (query ?? "").trim().toLowerCase();
  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  const filters: SQL[] = [];

  if (q !== "") {
    const like = `%${escaped}%`;
    filters.push(
      sql`(lower(${exercise_catalog.name}) like ${like} escape '\\' or lower(${exercise_catalog.target}) like ${like} escape '\\' or lower(${exercise_catalog.equipment}) like ${like} escape '\\')`,
    );
  }
  if (target) filters.push(eq(exercise_catalog.target, target));
  if (equipment === EXERCISE_EQUIPMENT_OTHER) {
    filters.push(
      or(
        notInArray(exercise_catalog.equipment, [...EXERCISE_EQUIPMENT_KNOWN]),
        sql`${exercise_catalog.equipment} is null`,
      ) as SQL,
    );
  } else if (equipment) {
    filters.push(eq(exercise_catalog.equipment, equipment));
  }

  const where = filters.length > 0 ? and(...filters) : undefined;

  const [rows, counted] = await Promise.all([
    db
      .select({
        id: exercise_catalog.id,
        name: exercise_catalog.name,
        gif_path: exercise_catalog.gif_path,
        equipment: exercise_catalog.equipment,
        target: exercise_catalog.target,
      })
      .from(exercise_catalog)
      .where(where)
      .orderBy(
        q === ""
          ? sql`${exercise_catalog.name} asc`
          : sql`case
              when lower(${exercise_catalog.name}) like ${`${escaped}%`} escape '\\' then 0
              when lower(${exercise_catalog.name}) like ${`% ${escaped}%`} escape '\\' then 1
              when lower(${exercise_catalog.name}) like ${`%${escaped}%`} escape '\\' then 2
              else 3
            end, ${exercise_catalog.name} asc`,
      )
      .limit(EXERCISE_SEARCH_PAGE_SIZE + 1)
      .offset(offset),
    db
      .select({ value: sql<number>`count(*)` })
      .from(exercise_catalog)
      .where(where),
  ]);

  return {
    items: rows.slice(0, EXERCISE_SEARCH_PAGE_SIZE),
    hasMore: rows.length > EXERCISE_SEARCH_PAGE_SIZE,
    total: Number(counted[0]?.value ?? 0),
  };
}
