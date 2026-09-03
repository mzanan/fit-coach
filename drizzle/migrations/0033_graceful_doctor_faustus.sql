CREATE TABLE `days` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`logical_day` text NOT NULL,
	`day_type` text NOT NULL,
	`steps` integer,
	`notes` text,
	`closed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `days_user_day_idx` ON `days` (`user_id`,`logical_day`);--> statement-breakpoint
CREATE TABLE `routine_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`label` text NOT NULL,
	`name` text NOT NULL,
	`exercise_catalog_id` text,
	`sort` integer DEFAULT 0 NOT NULL,
	`target_sets` integer DEFAULT 3 NOT NULL,
	`target_reps` integer DEFAULT 8 NOT NULL,
	`current_weight` real,
	`per_side` integer DEFAULT false NOT NULL,
	`increment_kg` real DEFAULT 2.5 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_catalog_id`) REFERENCES `exercise_catalog`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `routine_exercises_user_label_idx` ON `routine_exercises` (`user_id`,`label`);--> statement-breakpoint
CREATE TABLE `routine_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`weekday` integer NOT NULL,
	`label` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `routine_slots_user_weekday_idx` ON `routine_slots` (`user_id`,`weekday`);--> statement-breakpoint
ALTER TABLE `catalog_items` ADD `delivery` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `catalog_items` ADD `dinner_only` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `catalog_items` ADD `company` text;--> statement-breakpoint
ALTER TABLE `catalog_items` ADD `closed_weekdays` text;--> statement-breakpoint
ALTER TABLE `catalog_items` ADD `auto_day_type` text;--> statement-breakpoint
ALTER TABLE `catalog_items` ADD `auto_category` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `calories_rest` real DEFAULT 1975 NOT NULL;