CREATE TABLE `absences` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`type` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`start_time` text,
	`end_time` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`request_note` text,
	`response_note` text,
	`requested_by` text NOT NULL,
	`responded_by` text,
	`responded_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`responded_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `checkup_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`checkup_id` text NOT NULL,
	`theme_item_id` text,
	`status` text NOT NULL,
	`suggested_name` text,
	`note` text,
	FOREIGN KEY (`checkup_id`) REFERENCES `checkups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`theme_item_id`) REFERENCES `theme_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `checkups` (
	`id` text PRIMARY KEY NOT NULL,
	`theme_period_id` text NOT NULL,
	`done_by` text,
	`note` text,
	`completed_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`theme_period_id`) REFERENCES `theme_periods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`done_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `theme_items` (
	`id` text PRIMARY KEY NOT NULL,
	`theme_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`theme_id`) REFERENCES `themes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `theme_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`theme_id` text NOT NULL,
	`started_by` text,
	`closed_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`theme_id`) REFERENCES `themes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`started_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `themes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `themes_name_unique` ON `themes` (`name`);--> statement-breakpoint
DROP TABLE `school_periods`;--> statement-breakpoint
DROP TABLE `schools`;