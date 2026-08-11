CREATE TABLE `user_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`set_at` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_rules_user_idx` ON `user_rules` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_rules_active_key_idx` ON `user_rules` (`user_id`,`key`) WHERE "user_rules"."active" = 1;