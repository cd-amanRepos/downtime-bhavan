CREATE TABLE `grievances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_id` text NOT NULL,
	`tag` text NOT NULL,
	`body` text NOT NULL,
	`ip_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`visible` integer DEFAULT true NOT NULL,
	`reports_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_grievances_site_time` ON `grievances` (`site_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_grievances_recent` ON `grievances` (`created_at`);--> statement-breakpoint
CREATE TABLE `rate_limit_attempts` (
	`action` text NOT NULL,
	`ip_hash` text NOT NULL,
	`slot_minute` integer NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`action`, `ip_hash`, `slot_minute`)
);
--> statement-breakpoint
CREATE TABLE `reactions` (
	`grievance_id` integer NOT NULL,
	`ip_hash` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`grievance_id`, `ip_hash`, `kind`),
	FOREIGN KEY (`grievance_id`) REFERENCES `grievances`(`id`) ON UPDATE no action ON DELETE no action
);
