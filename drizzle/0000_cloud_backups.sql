CREATE TABLE `cloud_backups` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
