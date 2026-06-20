CREATE TABLE `decision_resolutions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`phase` text NOT NULL,
	`decision_id` text NOT NULL,
	`option_id` text NOT NULL,
	`option_label` text NOT NULL,
	`resolved_at` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `phase_runs` ADD `session_id` text;--> statement-breakpoint
ALTER TABLE `phase_runs` ADD `context_pack_hash` text;