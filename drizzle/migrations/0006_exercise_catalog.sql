CREATE TABLE `exercise_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`body_part` text,
	`equipment` text,
	`target` text,
	`muscle_group` text,
	`secondary_muscles` text,
	`gif_path` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `workout_exercises` ADD `exercise_catalog_id` text REFERENCES exercise_catalog(id) ON DELETE SET NULL;