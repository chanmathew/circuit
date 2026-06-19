import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const repos = sqliteTable('repos', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  path: text('path').notNull(),
  defaultBranch: text('default_branch').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  repoId: text('repo_id')
    .notNull()
    .references(() => repos.id),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  description: text('description').notNull(),
  workflowType: text('workflow_type').notNull(),
  status: text('status').notNull(),
  currentPhase: text('current_phase').notNull(),
  branchName: text('branch_name').notNull(),
  workspacePath: text('workspace_path').notNull(),
  workspaceStrategy: text('workspace_strategy').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const phases = sqliteTable('phases', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id),
  name: text('name').notNull(),
  status: text('status').notNull(),
  order: integer('order').notNull(),
  currentArtifactId: text('current_artifact_id'),
  dependsOnArtifactIds: text('depends_on_artifact_ids').notNull().default('[]'),
  staleReason: text('stale_reason'),
})

export const artifacts = sqliteTable('artifacts', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id),
  phase: text('phase').notNull(),
  path: text('path').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  version: integer('version').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const phaseRuns = sqliteTable('phase_runs', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id),
  phase: text('phase').notNull(),
  agent: text('agent').notNull(),
  model: text('model').notNull(),
  status: text('status').notNull(),
  inputPrompt: text('input_prompt').notNull(),
  transcript: text('transcript').notNull(),
  filesRead: text('files_read').notNull(),
  filesChanged: text('files_changed').notNull(),
  commandsRun: text('commands_run').notNull(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
})

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id),
  strategy: text('strategy').notNull(),
  path: text('path').notNull(),
  branchName: text('branch_name').notNull(),
  createdAt: text('created_at').notNull(),
})

export const validationRuns = sqliteTable('validation_runs', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id),
  command: text('command').notNull(),
  exitCode: integer('exit_code'),
  output: text('output').notNull(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
