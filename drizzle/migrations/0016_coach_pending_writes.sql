CREATE TABLE `coach_pending_writes` (
	`user_id` text PRIMARY KEY NOT NULL,
	`approval_id` text NOT NULL,
	`question` text,
	`messages` text NOT NULL,
	`preview` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
