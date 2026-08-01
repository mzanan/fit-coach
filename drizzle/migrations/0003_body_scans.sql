CREATE TABLE `body_scans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`taken_at` integer NOT NULL,
	`weight_kg` real,
	`skeletal_muscle_kg` real,
	`body_fat_kg` real,
	`body_fat_pct` real,
	`bmi` real,
	`visceral_fat_level` real,
	`total_body_water_l` real,
	`bmr_kcal` real,
	`inbody_score` real,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `body_scans_user_taken_idx` ON `body_scans` (`user_id`,`taken_at`);