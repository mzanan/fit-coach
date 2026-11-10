CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"effective_from" text NOT NULL,
	"phase" text NOT NULL,
	"kcal_delta" integer,
	"protein_target" double precision NOT NULL,
	"fat_min" double precision NOT NULL,
	"fat_max" double precision NOT NULL,
	"fat_floor" double precision NOT NULL,
	"carbs_gym" double precision NOT NULL,
	"carbs_rest" double precision NOT NULL,
	"calories_target" double precision NOT NULL,
	"calories_rest" double precision NOT NULL,
	"decision" text NOT NULL,
	"reason" text NOT NULL,
	"review_on" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"effective_from" text,
	"ended_on" text,
	"name" text NOT NULL,
	"reason" text,
	"review_on" text,
	"routine" jsonb NOT NULL,
	"final_routine" jsonb,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_versions" ADD CONSTRAINT "routine_versions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plans_user_from_idx" ON "plans" USING btree ("user_id","effective_from");--> statement-breakpoint
CREATE INDEX "routine_versions_user_from_idx" ON "routine_versions" USING btree ("user_id","effective_from");