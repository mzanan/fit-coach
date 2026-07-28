import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { EXERCISE_DATASET_REF } from "@/lib/exercises";

const { exercise_catalog } = schema;

const DATASET_URL = `https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@${EXERCISE_DATASET_REF}/data/exercises.json`;

interface DatasetExercise {
  id: string;
  name: string;
  category?: string;
  body_part?: string;
  equipment?: string;
  target?: string;
  muscle_group?: string;
  secondary_muscles?: string[];
  gif_url: string;
}

async function main() {
  const res = await fetch(DATASET_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const entries: DatasetExercise[] = await res.json();

  const rows = entries.map((e) => ({
    id: e.id,
    name: e.name,
    category: e.category ?? null,
    body_part: e.body_part ?? null,
    equipment: e.equipment ?? null,
    target: e.target ?? null,
    muscle_group: e.muscle_group ?? null,
    secondary_muscles: e.secondary_muscles ? JSON.stringify(e.secondary_muscles) : null,
    gif_path: e.gif_url,
  }));

  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db
      .insert(exercise_catalog)
      .values(rows.slice(i, i + CHUNK))
      .onConflictDoUpdate({
        target: exercise_catalog.id,
        set: {
          name: sql`excluded.name`,
          category: sql`excluded.category`,
          body_part: sql`excluded.body_part`,
          equipment: sql`excluded.equipment`,
          target: sql`excluded.target`,
          muscle_group: sql`excluded.muscle_group`,
          secondary_muscles: sql`excluded.secondary_muscles`,
          gif_path: sql`excluded.gif_path`,
        },
      });
  }

  console.log(`Synced ${rows.length} exercises into exercise_catalog.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
