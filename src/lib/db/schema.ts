import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Better Auth tables. Column names match the Better Auth Drizzle adapter
// (camelCase). Do not snake_case these.
// ---------------------------------------------------------------------------

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
    mode: "timestamp_ms",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
});

// ---------------------------------------------------------------------------
// App tables. snake_case columns. Every row carries user_id; every query must
// filter eq(table.user_id, user.id). No RLS backstop.
// ---------------------------------------------------------------------------

export const profiles = sqliteTable("profiles", {
  user_id: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  sex: text("sex").notNull().default("male"),
  birth_year: integer("birth_year"),
  height_cm: real("height_cm"),
  timezone: text("timezone").notNull().default("Asia/Ho_Chi_Minh"),
  day_cutoff_hour: integer("day_cutoff_hour").notNull().default(4),
  protein_target: real("protein_target").notNull().default(155),
  fat_min: real("fat_min").notNull().default(45),
  fat_max: real("fat_max").notNull().default(55),
  fat_floor: real("fat_floor").notNull().default(40),
  carbs_gym: real("carbs_gym").notNull().default(215),
  carbs_rest: real("carbs_rest").notNull().default(135),
  calories_target: real("calories_target").notNull().default(2150),
  seeded_at: integer("seeded_at", { mode: "timestamp_ms" }),
  created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updated_at: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const catalog_items = sqliteTable(
  "catalog_items",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    place: text("place"),
    protein_g: real("protein_g").notNull().default(0),
    fat_g: real("fat_g").notNull().default(0),
    carbs_g: real("carbs_g").notNull().default(0),
    fat_quality: text("fat_quality"),
    notes: text("notes"),
    is_composable: integer("is_composable", { mode: "boolean" })
      .notNull()
      .default(false),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
    created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updated_at: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("catalog_items_user_idx").on(t.user_id)],
);

export const catalog_components = sqliteTable(
  "catalog_components",
  {
    id: text("id").primaryKey(),
    item_id: text("item_id")
      .notNull()
      .references(() => catalog_items.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    group_name: text("group_name").notNull().default("other"),
    protein_g: real("protein_g").notNull().default(0),
    fat_g: real("fat_g").notNull().default(0),
    carbs_g: real("carbs_g").notNull().default(0),
    fat_quality: text("fat_quality"),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("catalog_components_item_idx").on(t.item_id)],
);

export const meals = sqliteTable(
  "meals",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    logical_day: text("logical_day").notNull(),
    category: text("category").notNull().default("lunch"),
    name: text("name").notNull(),
    place: text("place"),
    protein_g: real("protein_g").notNull().default(0),
    fat_g: real("fat_g").notNull().default(0),
    carbs_g: real("carbs_g").notNull().default(0),
    fat_quality: text("fat_quality"),
    catalog_item_id: text("catalog_item_id"),
    created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("meals_user_day_idx").on(t.user_id, t.logical_day)],
);

export const workouts = sqliteTable(
  "workouts",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    logical_day: text("logical_day").notNull(),
    label: text("label"),
    notes: text("notes"),
    created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("workouts_user_day_idx").on(t.user_id, t.logical_day)],
);

export const workout_exercises = sqliteTable(
  "workout_exercises",
  {
    id: text("id").primaryKey(),
    workout_id: text("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sort: integer("sort").notNull().default(0),
    notes: text("notes"),
  },
  (t) => [index("workout_exercises_workout_idx").on(t.workout_id)],
);

export const workout_sets = sqliteTable(
  "workout_sets",
  {
    id: text("id").primaryKey(),
    exercise_id: text("exercise_id")
      .notNull()
      .references(() => workout_exercises.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    set_index: integer("set_index").notNull().default(1),
    reps: integer("reps"),
    weight: real("weight"),
    per_side: integer("per_side", { mode: "boolean" }).notNull().default(false),
    is_pr: integer("is_pr", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("workout_sets_exercise_idx").on(t.exercise_id)],
);

export type Profile = typeof profiles.$inferSelect;
export type CatalogItem = typeof catalog_items.$inferSelect;
export type CatalogComponent = typeof catalog_components.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutExercise = typeof workout_exercises.$inferSelect;
export type WorkoutSet = typeof workout_sets.$inferSelect;
