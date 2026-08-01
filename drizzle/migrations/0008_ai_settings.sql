CREATE TABLE `ai_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`api_key_enc` text NOT NULL,
	`model` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
