ALTER TABLE `coach_facts` ADD `active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `coach_facts` ADD `superseded_by` text;