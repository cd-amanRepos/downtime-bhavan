ALTER TABLE `otp_attempts` ADD `kind` text DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `kind` text DEFAULT 'email' NOT NULL;