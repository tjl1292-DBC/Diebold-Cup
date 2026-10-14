ALTER TABLE `players` ADD `birth_date` text;--> statement-breakpoint
ALTER TABLE `players` ADD `birth_year` integer;--> statement-breakpoint
ALTER TABLE `players` ADD `birth_year_approx` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `birth_source` text;
