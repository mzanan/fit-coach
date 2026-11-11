CREATE TABLE "memory_files" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"path" text NOT NULL,
	"content" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memory_files" ADD CONSTRAINT "memory_files_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "memory_files_user_path_idx" ON "memory_files" USING btree ("user_id","path");--> statement-breakpoint
CREATE INDEX "write_changes_table_row_idx" ON "write_changes" USING btree ("table_name","row_id","created_at");--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "memory_files" TO app_rw;
--> statement-breakpoint
ALTER TABLE "memory_files" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "memory_files" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "memory_files_owner_only" ON "memory_files" TO app_rw USING (user_id = current_setting('app.user_id', true)) WITH CHECK (user_id = current_setting('app.user_id', true));
--> statement-breakpoint
CREATE TRIGGER "memory_files_write_changes" AFTER INSERT OR UPDATE OR DELETE ON "memory_files" FOR EACH ROW EXECUTE FUNCTION record_write_change();
--> statement-breakpoint
SELECT set_config('app.source', 'migration', true);
--> statement-breakpoint
INSERT INTO "memory_files" ("id", "user_id", "path", "content", "version", "created_at", "updated_at")
SELECT gen_random_uuid()::text, "user_id", "path", "title" || E'\n' || string_agg("line", E'\n' ORDER BY "subject"), 1, min("created_at"), max("updated_at")
FROM (
	SELECT
		"user_id",
		"subject",
		"created_at",
		"updated_at",
		'/memories/' || CASE WHEN "scope" LIKE 'location:%' THEN split_part(substr("scope", 10), ':', 1) || '/' ELSE '' END || "domain" || '.md' AS "path",
		CASE "domain"
			WHEN 'diet' THEN '# Diet: defaults, preferences and limits'
			WHEN 'restaurants' THEN '# Restaurants: where to eat and what to avoid'
			WHEN 'training' THEN '# Training: gym, schedule and routine'
			WHEN 'measurements' THEN '# Measurements: how and when to measure'
			WHEN 'health' THEN '# Health: conditions and supplements'
			WHEN 'lifestyle' THEN '# Lifestyle: steps, sleep and daily habits'
			WHEN 'context' THEN '# Context: who the user is'
			ELSE '# ' || "domain"
		END AS "title",
		'- ' || to_char("updated_at" AT TIME ZONE 'UTC', 'YYYY-MM-DD') || ': ' || regexp_replace("content", '\s+', ' ', 'g')
			|| CASE WHEN "review_on" IS NOT NULL THEN ' (review on ' || "review_on" || ')' ELSE '' END AS "line"
	FROM "user_facts"
) AS "facts"
GROUP BY "user_id", "path", "title";
