import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";

import { EMBEDDING_DIM } from "@/lib/constants";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified")
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { withTimezone: true, mode: "date" }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { withTimezone: true, mode: "date" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
});

export const jwks = pgTable("jwks", {
  id: text("id").primaryKey(),
  publicKey: text("publicKey").notNull(),
  privateKey: text("privateKey").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }),
  alg: text("alg"),
  crv: text("crv"),
});

export const oauthClient = pgTable(
  "oauthClient",
  {
    id: text("id").primaryKey(),
    clientId: text("clientId").notNull().unique(),
    clientSecret: text("clientSecret"),
    clientDiscoveryId: text("clientDiscoveryId"),
    disabled: boolean("disabled").default(false),
    skipConsent: boolean("skipConsent"),
    enableEndSession: boolean("enableEndSession"),
    subjectType: text("subjectType"),
    scopes: text("scopes").array(),
    clientCredentialsScopes: text("clientCredentialsScopes").array(),
    userId: text("userId").references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
    name: text("name"),
    uri: text("uri"),
    icon: text("icon"),
    contacts: text("contacts").array(),
    tos: text("tos"),
    policy: text("policy"),
    softwareId: text("softwareId"),
    softwareVersion: text("softwareVersion"),
    softwareStatement: text("softwareStatement"),
    redirectUris: text("redirectUris").array().notNull(),
    postLogoutRedirectUris: text("postLogoutRedirectUris").array(),
    backchannelLogoutUri: text("backchannelLogoutUri"),
    backchannelLogoutSessionRequired: boolean("backchannelLogoutSessionRequired"),
    tokenEndpointAuthMethod: text("tokenEndpointAuthMethod"),
    applicationType: text("applicationType"),
    jwks: text("jwks"),
    jwksUri: text("jwksUri"),
    grantTypes: text("grantTypes").array(),
    responseTypes: text("responseTypes").array(),
    requirePKCE: boolean("requirePKCE"),
    dpopBoundAccessTokens: boolean("dpopBoundAccessTokens").default(false),
    referenceId: text("referenceId"),
    metadata: jsonb("metadata"),
  },
  (t) => [index("oauth_client_user_idx").on(t.userId)],
);

export const oauthResource = pgTable("oauthResource", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull().unique(),
  name: text("name").notNull(),
  accessTokenTtl: integer("accessTokenTtl"),
  refreshTokenTtl: integer("refreshTokenTtl"),
  signingAlgorithm: text("signingAlgorithm"),
  signingKeyId: text("signingKeyId"),
  allowedScopes: text("allowedScopes").array(),
  customClaims: jsonb("customClaims"),
  dpopBoundAccessTokensRequired: boolean("dpopBoundAccessTokensRequired").default(false),
  disabled: boolean("disabled").default(false),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
  policyVersion: integer("policyVersion"),
  metadata: jsonb("metadata"),
});

export const oauthClientResource = pgTable(
  "oauthClientResource",
  {
    id: text("id").primaryKey(),
    clientId: text("clientId")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    resourceId: text("resourceId")
      .notNull()
      .references(() => oauthResource.identifier, { onDelete: "cascade" }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  },
  (t) => [
    index("oauth_client_resource_client_idx").on(t.clientId),
    index("oauth_client_resource_resource_idx").on(t.resourceId),
  ],
);

export const oauthRefreshToken = pgTable(
  "oauthRefreshToken",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    clientId: text("clientId")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    sessionId: text("sessionId").references(() => session.id, { onDelete: "set null" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    referenceId: text("referenceId"),
    authorizationCodeId: text("authorizationCodeId"),
    resources: text("resources").array(),
    requestedUserInfoClaims: text("requestedUserInfoClaims").array(),
    expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
    revoked: timestamp("revoked", { withTimezone: true, mode: "date" }),
    rotatedAt: timestamp("rotatedAt", { withTimezone: true, mode: "date" }),
    rotationReplayResponse: text("rotationReplayResponse"),
    rotationReplayExpiresAt: timestamp("rotationReplayExpiresAt", { withTimezone: true, mode: "date" }),
    authTime: timestamp("authTime", { withTimezone: true, mode: "date" }),
    confirmation: jsonb("confirmation"),
    scopes: text("scopes").array().notNull(),
  },
  (t) => [
    index("oauth_refresh_client_idx").on(t.clientId),
    index("oauth_refresh_session_idx").on(t.sessionId),
    index("oauth_refresh_user_idx").on(t.userId),
    index("oauth_refresh_code_idx").on(t.authorizationCodeId),
  ],
);

export const oauthAccessToken = pgTable(
  "oauthAccessToken",
  {
    id: text("id").primaryKey(),
    token: text("token").unique(),
    clientId: text("clientId")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    sessionId: text("sessionId").references(() => session.id, { onDelete: "set null" }),
    userId: text("userId").references(() => user.id, { onDelete: "cascade" }),
    referenceId: text("referenceId"),
    authorizationCodeId: text("authorizationCodeId"),
    resources: text("resources").array(),
    requestedUserInfoClaims: text("requestedUserInfoClaims").array(),
    refreshId: text("refreshId").references(() => oauthRefreshToken.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
    revoked: timestamp("revoked", { withTimezone: true, mode: "date" }),
    confirmation: jsonb("confirmation"),
    scopes: text("scopes").array().notNull(),
  },
  (t) => [
    index("oauth_access_client_idx").on(t.clientId),
    index("oauth_access_session_idx").on(t.sessionId),
    index("oauth_access_user_idx").on(t.userId),
    index("oauth_access_code_idx").on(t.authorizationCodeId),
    index("oauth_access_refresh_idx").on(t.refreshId),
  ],
);

export const oauthConsent = pgTable(
  "oauthConsent",
  {
    id: text("id").primaryKey(),
    clientId: text("clientId")
      .notNull()
      .references(() => oauthClient.clientId, { onDelete: "cascade" }),
    userId: text("userId").references(() => user.id, { onDelete: "cascade" }),
    referenceId: text("referenceId"),
    resources: text("resources").array(),
    requestedUserInfoClaims: text("requestedUserInfoClaims").array(),
    scopes: text("scopes").array().notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
  },
  (t) => [
    index("oauth_consent_client_idx").on(t.clientId),
    index("oauth_consent_user_idx").on(t.userId),
  ],
);

export const oauthClientAssertion = pgTable("oauthClientAssertion", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
});

export const profiles = pgTable("profiles", {
  user_id: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  sex: text("sex").notNull().default("male"),
  birth_year: integer("birth_year"),
  height_cm: doublePrecision("height_cm"),
  timezone: text("timezone").notNull().default("Asia/Ho_Chi_Minh"),
  day_cutoff_hour: integer("day_cutoff_hour").notNull().default(4),
  protein_target: doublePrecision("protein_target"),
  fat_min: doublePrecision("fat_min"),
  fat_max: doublePrecision("fat_max"),
  fat_floor: doublePrecision("fat_floor"),
  carbs_gym: doublePrecision("carbs_gym"),
  carbs_rest: doublePrecision("carbs_rest"),
  calories_target: doublePrecision("calories_target"),
  calories_rest: doublePrecision("calories_rest"),
  seeded_at: timestamp("seeded_at", { withTimezone: true, mode: "date" }),
  ai_provider: text("ai_provider"),
  coach_rules: text("coach_rules"),
  summary_rules: text("summary_rules"),
  dining_mode: text("dining_mode"),
  chat_language: text("chat_language"),
  created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const catalog_items = pgTable(
  "catalog_items",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    place: text("place"),
    protein_g: doublePrecision("protein_g"),
    fat_g: doublePrecision("fat_g"),
    carbs_g: doublePrecision("carbs_g"),
    fat_quality: text("fat_quality"),
    notes: text("notes"),
    is_composable: boolean("is_composable")
      .notNull()
      .default(false),
    archived: boolean("archived").notNull().default(false),
    delivery: boolean("delivery").notNull().default(false),
    dinner_only: boolean("dinner_only")
      .notNull()
      .default(false),
    company: text("company"),
    closed_weekdays: text("closed_weekdays"),
    auto_day_type: text("auto_day_type"),
    auto_category: text("auto_category"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [index("catalog_items_user_idx").on(t.user_id)],
);

export const days = pgTable(
  "days",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    logical_day: text("logical_day").notNull(),
    day_type: text("day_type").notNull(),
    steps: integer("steps"),
    notes: text("notes"),
    closed_at: timestamp("closed_at", { withTimezone: true, mode: "date" }),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [
    uniqueIndex("days_user_day_idx").on(t.user_id, t.logical_day),
  ],
);

export const routine_slots = pgTable(
  "routine_slots",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    label: text("label").notNull(),
  },
  (t) => [
    uniqueIndex("routine_slots_user_weekday_idx").on(t.user_id, t.weekday),
  ],
);

export const catalog_components = pgTable(
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
    protein_g: doublePrecision("protein_g").notNull().default(0),
    fat_g: doublePrecision("fat_g").notNull().default(0),
    carbs_g: doublePrecision("carbs_g").notNull().default(0),
    fat_quality: text("fat_quality"),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("catalog_components_item_idx").on(t.item_id)],
);

export const meals = pgTable(
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
    protein_g: doublePrecision("protein_g").notNull().default(0),
    fat_g: doublePrecision("fat_g").notNull().default(0),
    carbs_g: doublePrecision("carbs_g").notNull().default(0),
    fat_quality: text("fat_quality"),
    catalog_item_id: text("catalog_item_id"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [index("meals_user_day_idx").on(t.user_id, t.logical_day)],
);

export const coach_memory = pgTable("coach_memory", {
  user_id: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const push_subscriptions = pgTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [
    uniqueIndex("push_subscriptions_user_endpoint_idx").on(
      t.user_id,
      t.endpoint,
    ),
    index("push_subscriptions_endpoint_idx").on(t.endpoint),
  ],
);

export const ai_credentials = pgTable(
  "ai_credentials",
  {
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    api_key_enc: text("api_key_enc").notNull(),
    model: text("model").notNull(),
    reasoning_effort: text("reasoning_effort").notNull().default("low"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.user_id, t.provider] })],
);

export const coach_messages = pgTable(
  "coach_messages",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    generated: boolean("generated")
      .notNull()
      .default(true),
    status: text("status").notNull().default("done"),
    day_summary: text("day_summary"),
    learned: text("learned"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [index("coach_messages_user_idx").on(t.user_id, t.created_at)],
);

export const coach_pending_writes = pgTable("coach_pending_writes", {
  user_id: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  approval_id: text("approval_id").notNull(),
  question: text("question"),
  messages: text("messages").notNull(),
  preview: text("preview").notNull(),
  created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const coach_facts = pgTable(
  "coach_facts",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    category: text("category").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIM }),
    embedding_model: text("embedding_model")
      .notNull()
      .default("gemini-embedding-001/768"),
    source: text("source"),
    subject: text("subject"),
    active: boolean("active").notNull().default(true),
    superseded_by: text("superseded_by"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [
    index("coach_facts_user_idx").on(t.user_id),
    uniqueIndex("coach_facts_active_subject_idx")
      .on(t.user_id, t.subject)
      .where(sql`${t.active} = true AND ${t.subject} IS NOT NULL`),
  ],
);

export const user_rules = pgTable(
  "user_rules",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    set_at: timestamp("set_at", { withTimezone: true, mode: "date" }).notNull(),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    index("user_rules_user_idx").on(t.user_id),
    uniqueIndex("user_rules_active_key_idx")
      .on(t.user_id, t.key)
      .where(sql`${t.active} = true`),
  ],
);

export const fatigue_logs = pgTable(
  "fatigue_logs",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    logical_day: text("logical_day").notNull(),
    time_of_day: text("time_of_day").notNull(),
    score: integer("score"),
    sleep_hours: doublePrecision("sleep_hours"),
    sleep_location: text("sleep_location"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [
    index("fatigue_logs_user_day_idx").on(t.user_id, t.logical_day),
    uniqueIndex("fatigue_logs_user_day_time_idx").on(
      t.user_id,
      t.logical_day,
      t.time_of_day,
    ),
  ],
);

export const ai_events = pgTable(
  "ai_events",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider"),
    model: text("model"),
    kind: text("kind").notNull(),
    detail: text("detail"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [index("ai_events_user_idx").on(t.user_id, t.created_at)],
);

export const workouts = pgTable(
  "workouts",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    logical_day: text("logical_day").notNull(),
    label: text("label"),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [uniqueIndex("workouts_user_day_idx").on(t.user_id, t.logical_day)],
);

export const exercise_catalog = pgTable("exercise_catalog", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  body_part: text("body_part"),
  equipment: text("equipment"),
  target: text("target"),
  muscle_group: text("muscle_group"),
  secondary_muscles: text("secondary_muscles"),
  gif_path: text("gif_path").notNull(),
});

export const plans = pgTable(
  "plans",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    effective_from: text("effective_from").notNull(),
    phase: text("phase").notNull(),
    kcal_delta: integer("kcal_delta"),
    protein_target: doublePrecision("protein_target").notNull(),
    fat_min: doublePrecision("fat_min").notNull(),
    fat_max: doublePrecision("fat_max").notNull(),
    fat_floor: doublePrecision("fat_floor").notNull(),
    carbs_gym: doublePrecision("carbs_gym").notNull(),
    carbs_rest: doublePrecision("carbs_rest").notNull(),
    calories_target: doublePrecision("calories_target").notNull(),
    calories_rest: doublePrecision("calories_rest").notNull(),
    decision: text("decision").notNull(),
    reason: text("reason").notNull(),
    review_on: text("review_on"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [index("plans_user_from_idx").on(t.user_id, t.effective_from)],
);

export const routine_versions = pgTable(
  "routine_versions",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    effective_from: text("effective_from"),
    ended_on: text("ended_on"),
    name: text("name").notNull(),
    reason: text("reason"),
    review_on: text("review_on"),
    routine: jsonb("routine").notNull(),
    final_routine: jsonb("final_routine"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [index("routine_versions_user_from_idx").on(t.user_id, t.effective_from)],
);

export const routine_exercises = pgTable(
  "routine_exercises",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    name: text("name").notNull(),
    exercise_catalog_id: text("exercise_catalog_id").references(
      () => exercise_catalog.id,
      { onDelete: "set null" },
    ),
    sort: integer("sort").notNull().default(0),
    target_sets: integer("target_sets").notNull().default(3),
    target_reps: integer("target_reps").notNull().default(8),
    current_weight: doublePrecision("current_weight"),
    per_side: boolean("per_side").notNull().default(false),
    increment_kg: doublePrecision("increment_kg").notNull().default(2.5),
    active: boolean("active").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [index("routine_exercises_user_label_idx").on(t.user_id, t.label)],
);

export const workout_exercises = pgTable(
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
    exercise_catalog_id: text("exercise_catalog_id").references(
      () => exercise_catalog.id,
      { onDelete: "set null" },
    ),
  },
  (t) => [index("workout_exercises_workout_idx").on(t.workout_id)],
);

export const workout_sets = pgTable(
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
    weight: doublePrecision("weight"),
    per_side: boolean("per_side").notNull().default(false),
    is_pr: boolean("is_pr").notNull().default(false),
  },
  (t) => [index("workout_sets_exercise_idx").on(t.exercise_id)],
);

export const body_scans = pgTable(
  "body_scans",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    taken_at: timestamp("taken_at", { withTimezone: true, mode: "date" }).notNull(),
    weight_kg: doublePrecision("weight_kg"),
    skeletal_muscle_kg: doublePrecision("skeletal_muscle_kg"),
    body_fat_kg: doublePrecision("body_fat_kg"),
    body_fat_pct: doublePrecision("body_fat_pct"),
    bmi: doublePrecision("bmi"),
    visceral_fat_level: doublePrecision("visceral_fat_level"),
    total_body_water_l: doublePrecision("total_body_water_l"),
    bmr_kcal: doublePrecision("bmr_kcal"),
    inbody_score: doublePrecision("inbody_score"),
    device: text("device"),
    location: text("location"),
    member_id: text("member_id"),
    height_cm: doublePrecision("height_cm"),
    age: doublePrecision("age"),
    gender: text("gender"),
    body_balance_upper: text("body_balance_upper"),
    body_balance_lower: text("body_balance_lower"),
    body_balance_upper_lower: text("body_balance_upper_lower"),
    protein_kg: doublePrecision("protein_kg"),
    minerals_kg: doublePrecision("minerals_kg"),
    bone_mineral_kg: doublePrecision("bone_mineral_kg"),
    soft_lean_mass_kg: doublePrecision("soft_lean_mass_kg"),
    fat_free_mass_kg: doublePrecision("fat_free_mass_kg"),
    body_cell_mass_kg: doublePrecision("body_cell_mass_kg"),
    ecw_ratio: doublePrecision("ecw_ratio"),
    phase_angle: doublePrecision("phase_angle"),
    smi: doublePrecision("smi"),
    visceral_fat_area_cm2: doublePrecision("visceral_fat_area_cm2"),
    waist_circumference_cm: doublePrecision("waist_circumference_cm"),
    waist_hip_ratio: doublePrecision("waist_hip_ratio"),
    obesity_degree_pct: doublePrecision("obesity_degree_pct"),
    recommended_kcal: doublePrecision("recommended_kcal"),
    target_weight_kg: doublePrecision("target_weight_kg"),
    weight_control_kg: doublePrecision("weight_control_kg"),
    fat_control_kg: doublePrecision("fat_control_kg"),
    muscle_control_kg: doublePrecision("muscle_control_kg"),
    segmental: text("segmental"),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [index("body_scans_user_taken_idx").on(t.user_id, t.taken_at)],
);

export const body_measurements = pgTable(
  "body_measurements",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    value: doublePrecision("value"),
    logical_day: text("logical_day").notNull(),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [
    index("body_measurements_user_type_day_idx").on(
      t.user_id,
      t.type,
      t.logical_day,
    ),
  ],
);

export const import_runs = pgTable(
  "import_runs",
  {
    run_id: text("run_id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [index("import_runs_user_idx").on(t.user_id)],
);

export const import_files = pgTable(
  "import_files",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: text("status", {
      enum: ["processing", "done", "error"],
    }).notNull(),
    chunk_index: integer("chunk_index").notNull().default(0),
    chunk_total: integer("chunk_total").notNull().default(0),
    error: text("error"),
    text_hash: text("text_hash"),
    result: text("result"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    started_at: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [
    index("import_files_user_idx").on(t.user_id),
    uniqueIndex("import_files_user_name_idx").on(t.user_id, t.name),
  ],
);

export const import_chunks = pgTable(
  "import_chunks",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    chunk_hash: text("chunk_hash").notNull(),
    result: text("result").notNull(),
    created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [
    uniqueIndex("import_chunks_user_hash_idx").on(t.user_id, t.chunk_hash),
  ],
);

export type Profile = typeof profiles.$inferSelect;
export type CatalogItem = typeof catalog_items.$inferSelect;
export type CatalogComponent = typeof catalog_components.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type CoachMemory = typeof coach_memory.$inferSelect;
export type CoachFact = typeof coach_facts.$inferSelect;
export type UserRule = typeof user_rules.$inferSelect;
export type FatigueLog = typeof fatigue_logs.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutExercise = typeof workout_exercises.$inferSelect;
export type WorkoutSet = typeof workout_sets.$inferSelect;
export type ExerciseCatalogItem = typeof exercise_catalog.$inferSelect;
export type BodyScan = typeof body_scans.$inferSelect;
export type BodyMeasurement = typeof body_measurements.$inferSelect;
export type PushSubscription = typeof push_subscriptions.$inferSelect;
export type Day = typeof days.$inferSelect;
export type RoutineSlot = typeof routine_slots.$inferSelect;
export type RoutineExercise = typeof routine_exercises.$inferSelect;
export type ImportRun = typeof import_runs.$inferSelect;
export type ImportFile = typeof import_files.$inferSelect;

export type Plan = typeof plans.$inferSelect;
export type RoutineVersion = typeof routine_versions.$inferSelect;
