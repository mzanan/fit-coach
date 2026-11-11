CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_credentials" (
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"api_key_enc" text NOT NULL,
	"model" text NOT NULL,
	"reasoning_effort" text DEFAULT 'low' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "ai_credentials_user_id_provider_pk" PRIMARY KEY("user_id","provider")
);
--> statement-breakpoint
CREATE TABLE "ai_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text,
	"model" text,
	"kind" text NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "body_measurements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"value" double precision,
	"logical_day" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "body_scans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"taken_at" timestamp with time zone NOT NULL,
	"weight_kg" double precision,
	"skeletal_muscle_kg" double precision,
	"body_fat_kg" double precision,
	"body_fat_pct" double precision,
	"bmi" double precision,
	"visceral_fat_level" double precision,
	"total_body_water_l" double precision,
	"bmr_kcal" double precision,
	"inbody_score" double precision,
	"device" text,
	"location" text,
	"member_id" text,
	"height_cm" double precision,
	"age" double precision,
	"gender" text,
	"body_balance_upper" text,
	"body_balance_lower" text,
	"body_balance_upper_lower" text,
	"protein_kg" double precision,
	"minerals_kg" double precision,
	"bone_mineral_kg" double precision,
	"soft_lean_mass_kg" double precision,
	"fat_free_mass_kg" double precision,
	"body_cell_mass_kg" double precision,
	"ecw_ratio" double precision,
	"phase_angle" double precision,
	"smi" double precision,
	"visceral_fat_area_cm2" double precision,
	"waist_circumference_cm" double precision,
	"waist_hip_ratio" double precision,
	"obesity_degree_pct" double precision,
	"recommended_kcal" double precision,
	"target_weight_kg" double precision,
	"weight_control_kg" double precision,
	"fat_control_kg" double precision,
	"muscle_control_kg" double precision,
	"segmental" text,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_components" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"group_name" text DEFAULT 'other' NOT NULL,
	"protein_g" double precision DEFAULT 0 NOT NULL,
	"fat_g" double precision DEFAULT 0 NOT NULL,
	"carbs_g" double precision DEFAULT 0 NOT NULL,
	"fat_quality" text,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"place" text,
	"protein_g" double precision,
	"fat_g" double precision,
	"carbs_g" double precision,
	"fat_quality" text,
	"notes" text,
	"is_composable" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"delivery" boolean DEFAULT false NOT NULL,
	"dinner_only" boolean DEFAULT false NOT NULL,
	"company" text,
	"closed_weekdays" text,
	"auto_day_type" text,
	"auto_category" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_facts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"embedding" vector(768),
	"embedding_model" text DEFAULT 'gemini-embedding-001/768' NOT NULL,
	"source" text,
	"subject" text,
	"active" boolean DEFAULT true NOT NULL,
	"superseded_by" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_memory" (
	"user_id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"generated" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'done' NOT NULL,
	"day_summary" text,
	"learned" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_pending_writes" (
	"user_id" text PRIMARY KEY NOT NULL,
	"approval_id" text NOT NULL,
	"question" text,
	"messages" text NOT NULL,
	"preview" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "days" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"logical_day" text NOT NULL,
	"day_type" text NOT NULL,
	"steps" integer,
	"notes" text,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"body_part" text,
	"equipment" text,
	"target" text,
	"muscle_group" text,
	"secondary_muscles" text,
	"gif_path" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fatigue_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"logical_day" text NOT NULL,
	"time_of_day" text NOT NULL,
	"score" integer,
	"sleep_hours" double precision,
	"sleep_location" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"chunk_hash" text NOT NULL,
	"result" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_files" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"chunk_index" integer DEFAULT 0 NOT NULL,
	"chunk_total" integer DEFAULT 0 NOT NULL,
	"error" text,
	"text_hash" text,
	"result" text,
	"created_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_runs" (
	"run_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"logical_day" text NOT NULL,
	"category" text DEFAULT 'lunch' NOT NULL,
	"name" text NOT NULL,
	"place" text,
	"protein_g" double precision DEFAULT 0 NOT NULL,
	"fat_g" double precision DEFAULT 0 NOT NULL,
	"carbs_g" double precision DEFAULT 0 NOT NULL,
	"fat_quality" text,
	"catalog_item_id" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"sex" text DEFAULT 'male' NOT NULL,
	"birth_year" integer,
	"height_cm" double precision,
	"timezone" text DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
	"day_cutoff_hour" integer DEFAULT 4 NOT NULL,
	"protein_target" double precision,
	"fat_min" double precision,
	"fat_max" double precision,
	"fat_floor" double precision,
	"carbs_gym" double precision,
	"carbs_rest" double precision,
	"calories_target" double precision,
	"calories_rest" double precision,
	"seeded_at" timestamp with time zone,
	"ai_provider" text,
	"coach_rules" text,
	"summary_rules" text,
	"dining_mode" text,
	"chat_language" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"label" text NOT NULL,
	"name" text NOT NULL,
	"exercise_catalog_id" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"target_sets" integer DEFAULT 3 NOT NULL,
	"target_reps" integer DEFAULT 8 NOT NULL,
	"current_weight" double precision,
	"per_side" boolean DEFAULT false NOT NULL,
	"increment_kg" double precision DEFAULT 2.5 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"weekday" integer NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"set_at" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"workout_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"exercise_catalog_id" text
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" text PRIMARY KEY NOT NULL,
	"exercise_id" text NOT NULL,
	"user_id" text NOT NULL,
	"set_index" integer DEFAULT 1 NOT NULL,
	"reps" integer,
	"weight" double precision,
	"per_side" boolean DEFAULT false NOT NULL,
	"is_pr" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"logical_day" text NOT NULL,
	"label" text,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_credentials" ADD CONSTRAINT "ai_credentials_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_events" ADD CONSTRAINT "ai_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_scans" ADD CONSTRAINT "body_scans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_components" ADD CONSTRAINT "catalog_components_item_id_catalog_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_components" ADD CONSTRAINT "catalog_components_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_facts" ADD CONSTRAINT "coach_facts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_memory" ADD CONSTRAINT "coach_memory_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_messages" ADD CONSTRAINT "coach_messages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_pending_writes" ADD CONSTRAINT "coach_pending_writes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "days" ADD CONSTRAINT "days_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fatigue_logs" ADD CONSTRAINT "fatigue_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_chunks" ADD CONSTRAINT "import_chunks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_files" ADD CONSTRAINT "import_files_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_runs" ADD CONSTRAINT "import_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_exercise_catalog_id_exercise_catalog_id_fk" FOREIGN KEY ("exercise_catalog_id") REFERENCES "public"."exercise_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_slots" ADD CONSTRAINT "routine_slots_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rules" ADD CONSTRAINT "user_rules_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exercise_catalog_id_exercise_catalog_id_fk" FOREIGN KEY ("exercise_catalog_id") REFERENCES "public"."exercise_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_exercise_id_workout_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."workout_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_events_user_idx" ON "ai_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "body_measurements_user_type_day_idx" ON "body_measurements" USING btree ("user_id","type","logical_day");--> statement-breakpoint
CREATE INDEX "body_scans_user_taken_idx" ON "body_scans" USING btree ("user_id","taken_at");--> statement-breakpoint
CREATE INDEX "catalog_components_item_idx" ON "catalog_components" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "catalog_items_user_idx" ON "catalog_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "coach_facts_user_idx" ON "coach_facts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coach_facts_active_subject_idx" ON "coach_facts" USING btree ("user_id","subject") WHERE "coach_facts"."active" = true AND "coach_facts"."subject" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "coach_messages_user_idx" ON "coach_messages" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "days_user_day_idx" ON "days" USING btree ("user_id","logical_day");--> statement-breakpoint
CREATE INDEX "fatigue_logs_user_day_idx" ON "fatigue_logs" USING btree ("user_id","logical_day");--> statement-breakpoint
CREATE UNIQUE INDEX "fatigue_logs_user_day_time_idx" ON "fatigue_logs" USING btree ("user_id","logical_day","time_of_day");--> statement-breakpoint
CREATE UNIQUE INDEX "import_chunks_user_hash_idx" ON "import_chunks" USING btree ("user_id","chunk_hash");--> statement-breakpoint
CREATE INDEX "import_files_user_idx" ON "import_files" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_files_user_name_idx" ON "import_files" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "import_runs_user_idx" ON "import_runs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "meals_user_day_idx" ON "meals" USING btree ("user_id","logical_day");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_user_endpoint_idx" ON "push_subscriptions" USING btree ("user_id","endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "routine_exercises_user_label_idx" ON "routine_exercises" USING btree ("user_id","label");--> statement-breakpoint
CREATE UNIQUE INDEX "routine_slots_user_weekday_idx" ON "routine_slots" USING btree ("user_id","weekday");--> statement-breakpoint
CREATE INDEX "user_rules_user_idx" ON "user_rules" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_rules_active_key_idx" ON "user_rules" USING btree ("user_id","key") WHERE "user_rules"."active" = true;--> statement-breakpoint
CREATE INDEX "workout_exercises_workout_idx" ON "workout_exercises" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX "workout_sets_exercise_idx" ON "workout_sets" USING btree ("exercise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workouts_user_day_idx" ON "workouts" USING btree ("user_id","logical_day");