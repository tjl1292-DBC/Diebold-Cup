CREATE TABLE `awards` (
	`id` text PRIMARY KEY NOT NULL,
	`season_year` integer NOT NULL,
	`type` text NOT NULL,
	`club_id` text,
	`description` text NOT NULL,
	`names_text` text,
	`score_text` text,
	`tied` integer DEFAULT false NOT NULL,
	`entry_id` text,
	`player_id` text,
	FOREIGN KEY (`season_year`) REFERENCES `seasons`(`year`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clubs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`abbreviation` text NOT NULL,
	`first_season` integer NOT NULL,
	`first_season_certain` integer DEFAULT true NOT NULL,
	`last_season` integer,
	`last_season_certain` integer DEFAULT true NOT NULL,
	`seat_note` text,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `data_flags` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`severity` text NOT NULL,
	`source` text NOT NULL,
	`season_year` integer,
	`session_id` text,
	`club_id` text,
	`entry_id` text,
	`player_id` text,
	`message` text NOT NULL,
	`acknowledged` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`season_year`) REFERENCES `seasons`(`year`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `flags_season` ON `data_flags` (`season_year`);--> statement-breakpoint
CREATE INDEX `flags_entry` ON `data_flags` (`entry_id`);--> statement-breakpoint
CREATE INDEX `flags_player` ON `data_flags` (`player_id`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`date_text` text,
	`sort_order` integer NOT NULL,
	`body` text NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`summary` text
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`club_id` text NOT NULL,
	`line_no` integer NOT NULL,
	`raw_names` text NOT NULL,
	`gross` integer,
	`total_recorded` real,
	`total_points` real NOT NULL,
	`available` real NOT NULL,
	`total_derived` integer DEFAULT false NOT NULL,
	`sheet_note` text,
	`source_ref` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `entries_session` ON `entries` (`session_id`);--> statement-breakpoint
CREATE INDEX `entries_club` ON `entries` (`club_id`);--> statement-breakpoint
CREATE TABLE `entry_opponent_points` (
	`entry_id` text NOT NULL,
	`opponent_club_id` text NOT NULL,
	`points` real NOT NULL,
	`available` real NOT NULL,
	PRIMARY KEY(`entry_id`, `opponent_club_id`),
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opponent_club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `eop_opponent` ON `entry_opponent_points` (`opponent_club_id`);--> statement-breakpoint
CREATE TABLE `entry_players` (
	`entry_id` text NOT NULL,
	`player_id` text NOT NULL,
	`position` integer NOT NULL,
	`raw_name` text NOT NULL,
	`method` text NOT NULL,
	`confidence` text NOT NULL,
	`candidates` text,
	PRIMARY KEY(`entry_id`, `position`),
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `entry_players_player` ON `entry_players` (`player_id`);--> statement-breakpoint
CREATE TABLE `eras` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`from_year` integer NOT NULL,
	`to_year` integer,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `import_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ran_at` text NOT NULL,
	`source_file` text NOT NULL,
	`source_sha256` text NOT NULL,
	`entry_count` integer NOT NULL,
	`player_count` integer NOT NULL,
	`summary` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player_aliases` (
	`player_id` text NOT NULL,
	`club_id` text NOT NULL,
	`raw_name` text NOT NULL,
	`occurrences` integer NOT NULL,
	`first_year` integer NOT NULL,
	`last_year` integer NOT NULL,
	`source` text NOT NULL,
	PRIMARY KEY(`club_id`, `raw_name`, `player_id`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`club_id` text NOT NULL,
	`display_name` text NOT NULL,
	`given_name` text,
	`initials` text,
	`surname` text NOT NULL,
	`suffix` text,
	`sort_name` text NOT NULL,
	`person_id` text,
	`first_season` integer,
	`last_season` integer,
	`source` text DEFAULT 'auto' NOT NULL,
	`needs_review` integer DEFAULT false NOT NULL,
	`review_note` text,
	`note` text,
	FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `players_club` ON `players` (`club_id`);--> statement-breakpoint
CREATE INDEX `players_surname` ON `players` (`surname`);--> statement-breakpoint
CREATE TABLE `seasons` (
	`year` integer PRIMARY KEY NOT NULL,
	`era_id` text,
	`status` text NOT NULL,
	`standings_final` integer DEFAULT true NOT NULL,
	`has_player_rows` integer DEFAULT false NOT NULL,
	`club_count` integer,
	`dates_text` text,
	`note` text,
	`status_note` text,
	FOREIGN KEY (`era_id`) REFERENCES `eras`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`season_year` integer NOT NULL,
	`ordinal` integer NOT NULL,
	`slot` text NOT NULL,
	`format` text NOT NULL,
	`name` text NOT NULL,
	`sheet_label` text,
	`venue_club_id` text,
	`venue_certain` integer DEFAULT true NOT NULL,
	`venue_note` text,
	`date_text` text,
	`pts_per_match` real NOT NULL,
	`matches_per_pairing` integer NOT NULL,
	`players_per_entry` integer NOT NULL,
	`has_player_rows` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`season_year`) REFERENCES `seasons`(`year`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`venue_club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_year_ordinal` ON `sessions` (`season_year`,`ordinal`);--> statement-breakpoint
CREATE TABLE `team_season_results` (
	`season_year` integer NOT NULL,
	`club_id` text NOT NULL,
	`final_points` real,
	`sum_of_sessions` real,
	`place` integer,
	`is_champion` integer DEFAULT false NOT NULL,
	`tied_for_first` integer DEFAULT false NOT NULL,
	`place_note` text,
	PRIMARY KEY(`season_year`, `club_id`),
	FOREIGN KEY (`season_year`) REFERENCES `seasons`(`year`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `team_session_results` (
	`session_id` text NOT NULL,
	`club_id` text NOT NULL,
	`points` real,
	`points_from_rows` real,
	`available` real,
	PRIMARY KEY(`session_id`, `club_id`),
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON UPDATE no action ON DELETE no action
);
