CREATE TABLE `import_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`chunk_hash` text NOT NULL,
	`result` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `import_chunks_user_hash_idx` ON `import_chunks` (`user_id`,`chunk_hash`);