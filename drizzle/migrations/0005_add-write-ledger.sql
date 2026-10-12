CREATE TABLE "write_changes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ledger_id" uuid,
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"table_name" text NOT NULL,
	"op" text NOT NULL,
	"row_id" text,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "write_ledger" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"tool" text NOT NULL,
	"idempotency_key" text,
	"input" jsonb,
	"receipt" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "write_changes" ADD CONSTRAINT "write_changes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "write_ledger" ADD CONSTRAINT "write_ledger_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "write_changes_ledger_idx" ON "write_changes" USING btree ("ledger_id");--> statement-breakpoint
CREATE INDEX "write_changes_user_created_idx" ON "write_changes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "write_ledger_user_key_idx" ON "write_ledger" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "write_ledger_user_created_idx" ON "write_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE OR REPLACE FUNCTION "record_write_change"() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
	old_row jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) - 'embedding' END;
	new_row jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) - 'embedding' END;
	row_data jsonb := coalesce(new_row, old_row);
	owner_id text := row_data->>'user_id';
BEGIN
	IF TG_OP = 'UPDATE' AND old_row = new_row THEN
		RETURN NULL;
	END IF;
	IF owner_id IS NULL OR NOT EXISTS (SELECT 1 FROM "user" WHERE "id" = owner_id) THEN
		RETURN NULL;
	END IF;
	INSERT INTO "write_changes" ("ledger_id", "user_id", "source", "table_name", "op", "row_id", "before", "after")
	VALUES (
		nullif(current_setting('app.ledger_id', true), '')::uuid,
		owner_id,
		coalesce(nullif(current_setting('app.source', true), ''), 'app'),
		TG_TABLE_NAME,
		lower(TG_OP),
		coalesce(row_data->>'id', owner_id),
		old_row,
		new_row
	);
	RETURN NULL;
END;
$$;
--> statement-breakpoint
DO $$
DECLARE
	audited text;
BEGIN
	FOREACH audited IN ARRAY ARRAY[
		'profiles', 'days', 'meals', 'catalog_items', 'catalog_components',
		'workouts', 'workout_exercises', 'workout_sets', 'routine_slots', 'routine_exercises',
		'routine_versions', 'plans', 'body_scans', 'body_measurements', 'fatigue_logs',
		'user_rules', 'coach_facts'
	] LOOP
		EXECUTE format(
			'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION record_write_change()',
			audited || '_write_changes', audited
		);
	END LOOP;
END;
$$;
