DROP INDEX "ai_events_user_idx";--> statement-breakpoint
DROP INDEX "body_measurements_user_type_day_idx";--> statement-breakpoint
DROP INDEX "body_scans_user_taken_idx";--> statement-breakpoint
DROP INDEX "catalog_components_item_idx";--> statement-breakpoint
DROP INDEX "catalog_items_user_idx";--> statement-breakpoint
DROP INDEX "coach_facts_user_idx";--> statement-breakpoint
DROP INDEX "coach_facts_active_subject_idx";--> statement-breakpoint
DROP INDEX "coach_messages_user_idx";--> statement-breakpoint
DROP INDEX "fatigue_logs_user_day_idx";--> statement-breakpoint
DROP INDEX "fatigue_logs_user_day_time_idx";--> statement-breakpoint
DROP INDEX "meals_user_day_idx";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
DROP INDEX "user_rules_user_idx";--> statement-breakpoint
DROP INDEX "user_rules_active_key_idx";--> statement-breakpoint
DROP INDEX "whoop_cycles_user_start_idx";--> statement-breakpoint
DROP INDEX "whoop_recovery_user_recorded_idx";--> statement-breakpoint
DROP INDEX "whoop_sleep_user_start_idx";--> statement-breakpoint
DROP INDEX "whoop_workouts_user_start_idx";--> statement-breakpoint
DROP INDEX "workout_exercises_workout_idx";--> statement-breakpoint
DROP INDEX "workout_sets_exercise_idx";--> statement-breakpoint
DROP INDEX "workouts_user_day_idx";--> statement-breakpoint
ALTER TABLE `fatigue_logs` ALTER COLUMN "score" TO "score" integer;--> statement-breakpoint
CREATE INDEX `ai_events_user_idx` ON `ai_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `body_measurements_user_type_day_idx` ON `body_measurements` (`user_id`,`type`,`logical_day`);--> statement-breakpoint
CREATE INDEX `body_scans_user_taken_idx` ON `body_scans` (`user_id`,`taken_at`);--> statement-breakpoint
CREATE INDEX `catalog_components_item_idx` ON `catalog_components` (`item_id`);--> statement-breakpoint
CREATE INDEX `catalog_items_user_idx` ON `catalog_items` (`user_id`);--> statement-breakpoint
CREATE INDEX `coach_facts_user_idx` ON `coach_facts` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `coach_facts_active_subject_idx` ON `coach_facts` (`user_id`,`subject`) WHERE "coach_facts"."active" = 1 AND "coach_facts"."subject" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `coach_messages_user_idx` ON `coach_messages` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `fatigue_logs_user_day_idx` ON `fatigue_logs` (`user_id`,`logical_day`);--> statement-breakpoint
CREATE UNIQUE INDEX `fatigue_logs_user_day_time_idx` ON `fatigue_logs` (`user_id`,`logical_day`,`time_of_day`);--> statement-breakpoint
CREATE INDEX `meals_user_day_idx` ON `meals` (`user_id`,`logical_day`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `user_rules_user_idx` ON `user_rules` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_rules_active_key_idx` ON `user_rules` (`user_id`,`key`) WHERE "user_rules"."active" = 1;--> statement-breakpoint
CREATE INDEX `whoop_cycles_user_start_idx` ON `whoop_cycles` (`user_id`,`start`);--> statement-breakpoint
CREATE INDEX `whoop_recovery_user_recorded_idx` ON `whoop_recovery` (`user_id`,`recorded_at`);--> statement-breakpoint
CREATE INDEX `whoop_sleep_user_start_idx` ON `whoop_sleep` (`user_id`,`start`);--> statement-breakpoint
CREATE INDEX `whoop_workouts_user_start_idx` ON `whoop_workouts` (`user_id`,`start`);--> statement-breakpoint
CREATE INDEX `workout_exercises_workout_idx` ON `workout_exercises` (`workout_id`);--> statement-breakpoint
CREATE INDEX `workout_sets_exercise_idx` ON `workout_sets` (`exercise_id`);--> statement-breakpoint
CREATE INDEX `workouts_user_day_idx` ON `workouts` (`user_id`,`logical_day`);