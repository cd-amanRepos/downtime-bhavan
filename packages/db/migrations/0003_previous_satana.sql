CREATE TABLE `otp_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone_hash` text NOT NULL,
	`code_hash` text NOT NULL,
	`purpose` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used` integer DEFAULT false NOT NULL,
	`ip_hash` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_otp_phone_time` ON `otp_attempts` (`phone_hash`,`created_at`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_id` text NOT NULL,
	`phone_hash` text NOT NULL,
	`phone_ciphertext` text,
	`status` text DEFAULT 'pending_otp' NOT NULL,
	`created_at` integer NOT NULL,
	`activated_at` integer,
	`triggered_at` integer,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_subs_site_status` ON `subscriptions` (`site_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_subs_phone` ON `subscriptions` (`phone_hash`);