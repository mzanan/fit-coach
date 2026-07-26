CREATE TABLE `whoop_connections` (
	`user_id` text PRIMARY KEY NOT NULL,
	`whoop_user_id` text,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`scope` text,
	`last_synced_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `whoop_cycles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer,
	`score_state` text NOT NULL,
	`strain` real,
	`kilojoule` real,
	`average_heart_rate` real,
	`max_heart_rate` real,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `whoop_cycles_user_start_idx` ON `whoop_cycles` (`user_id`,`start`);--> statement-breakpoint
CREATE TABLE `whoop_recovery` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`sleep_id` text,
	`recorded_at` integer NOT NULL,
	`score_state` text NOT NULL,
	`recovery_score` real,
	`resting_heart_rate` real,
	`hrv_rmssd_milli` real,
	`spo2_percentage` real,
	`skin_temp_celsius` real,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `whoop_recovery_user_recorded_idx` ON `whoop_recovery` (`user_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `whoop_sleep` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`nap` integer DEFAULT false NOT NULL,
	`score_state` text NOT NULL,
	`sleep_performance_percentage` real,
	`respiratory_rate` real,
	`time_in_bed_ms` integer,
	`time_asleep_ms` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `whoop_sleep_user_start_idx` ON `whoop_sleep` (`user_id`,`start`);--> statement-breakpoint
CREATE TABLE `whoop_workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`sport_name` text,
	`score_state` text NOT NULL,
	`strain` real,
	`average_heart_rate` real,
	`distance_meter` real,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `whoop_workouts_user_start_idx` ON `whoop_workouts` (`user_id`,`start`);