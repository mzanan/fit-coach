DROP INDEX "body_scans_user_taken_idx";--> statement-breakpoint
DROP INDEX "catalog_components_item_idx";--> statement-breakpoint
DROP INDEX "catalog_items_user_idx";--> statement-breakpoint
DROP INDEX "coach_facts_user_idx";--> statement-breakpoint
DROP INDEX "coach_messages_user_idx";--> statement-breakpoint
DROP INDEX "meals_user_day_idx";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
DROP INDEX "whoop_cycles_user_start_idx";--> statement-breakpoint
DROP INDEX "whoop_recovery_user_recorded_idx";--> statement-breakpoint
DROP INDEX "whoop_sleep_user_start_idx";--> statement-breakpoint
DROP INDEX "whoop_workouts_user_start_idx";--> statement-breakpoint
DROP INDEX "workout_exercises_workout_idx";--> statement-breakpoint
DROP INDEX "workout_sets_exercise_idx";--> statement-breakpoint
DROP INDEX "workouts_user_day_idx";--> statement-breakpoint
ALTER TABLE `catalog_items` ALTER COLUMN "protein_g" TO "protein_g" real;--> statement-breakpoint
CREATE INDEX `body_scans_user_taken_idx` ON `body_scans` (`user_id`,`taken_at`);--> statement-breakpoint
CREATE INDEX `catalog_components_item_idx` ON `catalog_components` (`item_id`);--> statement-breakpoint
CREATE INDEX `catalog_items_user_idx` ON `catalog_items` (`user_id`);--> statement-breakpoint
CREATE INDEX `coach_facts_user_idx` ON `coach_facts` (`user_id`);--> statement-breakpoint
CREATE INDEX `coach_messages_user_idx` ON `coach_messages` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `meals_user_day_idx` ON `meals` (`user_id`,`logical_day`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `whoop_cycles_user_start_idx` ON `whoop_cycles` (`user_id`,`start`);--> statement-breakpoint
CREATE INDEX `whoop_recovery_user_recorded_idx` ON `whoop_recovery` (`user_id`,`recorded_at`);--> statement-breakpoint
CREATE INDEX `whoop_sleep_user_start_idx` ON `whoop_sleep` (`user_id`,`start`);--> statement-breakpoint
CREATE INDEX `whoop_workouts_user_start_idx` ON `whoop_workouts` (`user_id`,`start`);--> statement-breakpoint
CREATE INDEX `workout_exercises_workout_idx` ON `workout_exercises` (`workout_id`);--> statement-breakpoint
CREATE INDEX `workout_sets_exercise_idx` ON `workout_sets` (`exercise_id`);--> statement-breakpoint
CREATE INDEX `workouts_user_day_idx` ON `workouts` (`user_id`,`logical_day`);--> statement-breakpoint
ALTER TABLE `catalog_items` ALTER COLUMN "fat_g" TO "fat_g" real;--> statement-breakpoint
ALTER TABLE `catalog_items` ALTER COLUMN "carbs_g" TO "carbs_g" real;