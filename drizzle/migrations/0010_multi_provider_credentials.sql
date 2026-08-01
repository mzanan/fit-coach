CREATE TABLE `ai_credentials` (
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`api_key_enc` text NOT NULL,
	`model` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `provider`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `profiles` ADD `ai_provider` text;--> statement-breakpoint
INSERT INTO `ai_credentials` (`user_id`, `provider`, `api_key_enc`, `model`, `created_at`, `updated_at`)
SELECT `user_id`, `provider`, `api_key_enc`, `model`, `created_at`, `updated_at` FROM `ai_settings`;--> statement-breakpoint
UPDATE `profiles` SET `ai_provider` = (SELECT `provider` FROM `ai_settings` WHERE `ai_settings`.`user_id` = `profiles`.`user_id`) WHERE EXISTS (SELECT 1 FROM `ai_settings` WHERE `ai_settings`.`user_id` = `profiles`.`user_id`);
