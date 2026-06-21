CREATE TABLE `workflow_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`status` text NOT NULL,
	`workflow_type` text NOT NULL,
	`title` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`cancelled_at` text,
	`current_phase_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `artifacts` ADD `workflow_run_id` text REFERENCES workflow_runs(id);--> statement-breakpoint
ALTER TABLE `decision_resolutions` ADD `workflow_run_id` text REFERENCES workflow_runs(id);--> statement-breakpoint
ALTER TABLE `phase_runs` ADD `workflow_run_id` text REFERENCES workflow_runs(id);--> statement-breakpoint
ALTER TABLE `phases` ADD `workflow_run_id` text REFERENCES workflow_runs(id);--> statement-breakpoint
ALTER TABLE `validation_runs` ADD `workflow_run_id` text REFERENCES workflow_runs(id);--> statement-breakpoint
ALTER TABLE `workflow_events` ADD `workflow_run_id` text REFERENCES workflow_runs(id);