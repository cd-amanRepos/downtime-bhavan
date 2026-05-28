CREATE TABLE `checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_id` text NOT NULL,
	`checked_at` integer NOT NULL,
	`layer` text NOT NULL,
	`result` text NOT NULL,
	`http_status` integer,
	`latency_ms` integer,
	`failure_reason` text,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_checks_site_time` ON `checks` (`site_id`,`checked_at`);--> statement-breakpoint
CREATE TABLE `site_status` (
	`site_id` text PRIMARY KEY NOT NULL,
	`current_state` text NOT NULL,
	`state_since` integer NOT NULL,
	`uptime_30d_pct` real,
	`last_check_at` integer NOT NULL,
	`community_flag` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`config_json` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL
);
