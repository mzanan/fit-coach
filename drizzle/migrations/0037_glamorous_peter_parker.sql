CREATE TABLE `import_files` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`chunk_index` integer DEFAULT 0 NOT NULL,
	`chunk_total` integer DEFAULT 0 NOT NULL,
	`error` text,
	`created_at` integer NOT NULL,
	`started_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `import_files_user_idx` ON `import_files` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `import_files_user_name_idx` ON `import_files` (`user_id`,`name`);