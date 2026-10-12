DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
		CREATE ROLE app_rw NOLOGIN NOBYPASSRLS;
	END IF;
END;
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO app_rw;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rw;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_rw;
--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "write_changes" FROM app_rw;
--> statement-breakpoint
DO $$
DECLARE
	owned text;
BEGIN
	FOREACH owned IN ARRAY ARRAY[
		'ai_credentials', 'ai_events', 'body_measurements', 'body_scans', 'catalog_components',
		'catalog_items', 'coach_facts', 'coach_memory', 'coach_messages', 'coach_pending_writes',
		'days', 'fatigue_logs', 'health_events', 'import_chunks', 'import_files',
		'import_runs', 'meals', 'plans', 'profiles', 'push_subscriptions',
		'reminders', 'routine_exercises', 'routine_slots', 'routine_versions', 'user_facts',
		'user_rules', 'workout_exercises', 'workout_sets', 'workouts', 'write_changes',
		'write_ledger'
	] LOOP
		EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', owned);
		EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', owned);
		EXECUTE format(
			'CREATE POLICY %I ON %I TO app_rw USING (user_id = current_setting(''app.user_id'', true)) WITH CHECK (user_id = current_setting(''app.user_id'', true))',
			owned || '_owner_only', owned
		);
	END LOOP;
END;
$$;
