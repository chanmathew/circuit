CREATE TABLE `workflow_events` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`phase_run_id` text,
	`actor` text NOT NULL,
	`type` text NOT NULL,
	`summary` text,
	`payload_json` text NOT NULL,
	`external_session_id` text,
	`external_message_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
