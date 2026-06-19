CREATE TABLE `artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`phase` text NOT NULL,
	`path` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`version` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `phase_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`phase` text NOT NULL,
	`agent` text NOT NULL,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`input_prompt` text NOT NULL,
	`transcript` text NOT NULL,
	`files_read` text NOT NULL,
	`files_changed` text NOT NULL,
	`commands_run` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `phases` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`order` integer NOT NULL,
	`current_artifact_id` text,
	`depends_on_artifact_ids` text DEFAULT '[]' NOT NULL,
	`stale_reason` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `repos` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`default_branch` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`repo_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text NOT NULL,
	`workflow_type` text NOT NULL,
	`status` text NOT NULL,
	`current_phase` text NOT NULL,
	`branch_name` text NOT NULL,
	`workspace_path` text NOT NULL,
	`workspace_strategy` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`repo_id`) REFERENCES `repos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `validation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`command` text NOT NULL,
	`exit_code` integer,
	`output` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`strategy` text NOT NULL,
	`path` text NOT NULL,
	`branch_name` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
