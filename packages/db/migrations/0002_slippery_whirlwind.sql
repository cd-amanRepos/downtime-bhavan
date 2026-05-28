CREATE TABLE `donations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`amount_inr` real NOT NULL,
	`source` text NOT NULL,
	`received_at` integer NOT NULL,
	`note` text
);
