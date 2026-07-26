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

export const coach_memory = sqliteTable("coach_memory", {
  user_id: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  updated_at: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

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

export const whoop_connections = sqliteTable("whoop_connections", {
  user_id: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  whoop_user_id: text("whoop_user_id"),
  access_token: text("access_token").notNull(),
  refresh_token: text("refresh_token").notNull(),
  expires_at: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  scope: text("scope"),
  last_synced_at: integer("last_synced_at", { mode: "timestamp_ms" }),
  created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updated_at: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const whoop_cycles = sqliteTable(
  "whoop_cycles",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    start: integer("start", { mode: "timestamp_ms" }).notNull(),
    end: integer("end", { mode: "timestamp_ms" }),
    score_state: text("score_state").notNull(),
    strain: real("strain"),
    kilojoule: real("kilojoule"),
    average_heart_rate: real("average_heart_rate"),
    max_heart_rate: real("max_heart_rate"),
  },
  (t) => [index("whoop_cycles_user_start_idx").on(t.user_id, t.start)],
);

export const whoop_recovery = sqliteTable(
  "whoop_recovery",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sleep_id: text("sleep_id"),
    recorded_at: integer("recorded_at", { mode: "timestamp_ms" }).notNull(),
    score_state: text("score_state").notNull(),
    recovery_score: real("recovery_score"),
    resting_heart_rate: real("resting_heart_rate"),
    hrv_rmssd_milli: real("hrv_rmssd_milli"),
    spo2_percentage: real("spo2_percentage"),
    skin_temp_celsius: real("skin_temp_celsius"),
  },
  (t) => [index("whoop_recovery_user_recorded_idx").on(t.user_id, t.recorded_at)],
);

export const whoop_sleep = sqliteTable(
  "whoop_sleep",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    start: integer("start", { mode: "timestamp_ms" }).notNull(),
    end: integer("end", { mode: "timestamp_ms" }).notNull(),
    nap: integer("nap", { mode: "boolean" }).notNull().default(false),
    score_state: text("score_state").notNull(),
    sleep_performance_percentage: real("sleep_performance_percentage"),
    respiratory_rate: real("respiratory_rate"),
    time_in_bed_ms: integer("time_in_bed_ms"),
    time_asleep_ms: integer("time_asleep_ms"),
  },
  (t) => [index("whoop_sleep_user_start_idx").on(t.user_id, t.start)],
);

export const whoop_workouts = sqliteTable(
  "whoop_workouts",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    start: integer("start", { mode: "timestamp_ms" }).notNull(),
    end: integer("end", { mode: "timestamp_ms" }).notNull(),
    sport_name: text("sport_name"),
    score_state: text("score_state").notNull(),
    strain: real("strain"),
    average_heart_rate: real("average_heart_rate"),
    distance_meter: real("distance_meter"),
  },
  (t) => [index("whoop_workouts_user_start_idx").on(t.user_id, t.start)],
);

export const body_scans = sqliteTable(
  "body_scans",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    taken_at: integer("taken_at", { mode: "timestamp_ms" }).notNull(),
    weight_kg: real("weight_kg"),
    skeletal_muscle_kg: real("skeletal_muscle_kg"),
    body_fat_kg: real("body_fat_kg"),
    body_fat_pct: real("body_fat_pct"),
    bmi: real("bmi"),
    visceral_fat_level: real("visceral_fat_level"),
    total_body_water_l: real("total_body_water_l"),
    bmr_kcal: real("bmr_kcal"),
    inbody_score: real("inbody_score"),
    device: text("device"),
    location: text("location"),
    member_id: text("member_id"),
    height_cm: real("height_cm"),
    age: real("age"),
    gender: text("gender"),
    body_balance_upper: text("body_balance_upper"),
    body_balance_lower: text("body_balance_lower"),
    body_balance_upper_lower: text("body_balance_upper_lower"),
    protein_kg: real("protein_kg"),
    minerals_kg: real("minerals_kg"),
    bone_mineral_kg: real("bone_mineral_kg"),
    soft_lean_mass_kg: real("soft_lean_mass_kg"),
    fat_free_mass_kg: real("fat_free_mass_kg"),
    body_cell_mass_kg: real("body_cell_mass_kg"),
    ecw_ratio: real("ecw_ratio"),
    phase_angle: real("phase_angle"),
    smi: real("smi"),
    visceral_fat_area_cm2: real("visceral_fat_area_cm2"),
    waist_circumference_cm: real("waist_circumference_cm"),
    waist_hip_ratio: real("waist_hip_ratio"),
    obesity_degree_pct: real("obesity_degree_pct"),
    recommended_kcal: real("recommended_kcal"),
    target_weight_kg: real("target_weight_kg"),
    weight_control_kg: real("weight_control_kg"),
    fat_control_kg: real("fat_control_kg"),
    muscle_control_kg: real("muscle_control_kg"),
    segmental: text("segmental"),
    notes: text("notes"),
    created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("body_scans_user_taken_idx").on(t.user_id, t.taken_at)],
);

export type Profile = typeof profiles.$inferSelect;
export type CatalogItem = typeof catalog_items.$inferSelect;
export type CatalogComponent = typeof catalog_components.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type CoachMemory = typeof coach_memory.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutExercise = typeof workout_exercises.$inferSelect;
export type WorkoutSet = typeof workout_sets.$inferSelect;
export type BodyScan = typeof body_scans.$inferSelect;
export type WhoopConnection = typeof whoop_connections.$inferSelect;
export type WhoopCycle = typeof whoop_cycles.$inferSelect;
export type WhoopRecovery = typeof whoop_recovery.$inferSelect;
export type WhoopSleep = typeof whoop_sleep.$inferSelect;
export type WhoopWorkout = typeof whoop_workouts.$inferSelect;
