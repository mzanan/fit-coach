CREATE TABLE `fatigue_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`logical_day` text NOT NULL,
	`time_of_day` text NOT NULL,
	`score` integer NOT NULL,
	`sleep_hours` real,
	`sleep_location` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `fatigue_logs_user_day_idx` ON `fatigue_logs` (`user_id`,`logical_day`);--> statement-breakpoint
CREATE UNIQUE INDEX `fatigue_logs_user_day_time_idx` ON `fatigue_logs` (`user_id`,`logical_day`,`time_of_day`);