ALTER TABLE "write_changes" NO FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
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
		coalesce(nullif(current_setting('app.source', true), ''), 'unknown'),
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
CREATE OR REPLACE FUNCTION "prune_write_history"(keep_days integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
	owner_id text := nullif(current_setting('app.user_id', true), '');
	removed integer;
BEGIN
	IF owner_id IS NULL OR keep_days < 30 THEN
		RETURN 0;
	END IF;
	DELETE FROM "write_changes" WHERE "user_id" = owner_id AND "created_at" < now() - make_interval(days => keep_days);
	GET DIAGNOSTICS removed = ROW_COUNT;
	RETURN removed;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "prune_write_history"(integer) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "prune_write_history"(integer) TO app_rw;
