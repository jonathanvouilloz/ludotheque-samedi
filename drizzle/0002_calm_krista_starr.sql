ALTER TABLE `checkup_entries` ADD `resolved_at` text;--> statement-breakpoint
ALTER TABLE `checkup_entries` ADD `resolved_by` text REFERENCES members(id);--> statement-breakpoint
ALTER TABLE `checkup_entries` ADD `resolution_type` text;