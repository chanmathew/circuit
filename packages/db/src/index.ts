export { createDb, type CircuitDb } from './client.js'
export { migrateDb } from './migrate.js'
export {
  getArtifactById,
  getArtifactByTaskAndPhase,
  getTicketArtifactForTask,
  getTicketArtifactForRun,
  insertArtifact,
  latestArtifactPerPhase,
  listArtifactsForTask,
  listArtifactsForWorkflowRun,
  deleteArtifact,
  updateArtifact,
  type ArtifactRow,
  type NewArtifactRow,
} from './artifacts.js'
export {
  getPhaseById,
  getPhaseByTaskAndName,
  insertPhase,
  insertPhases,
  listPhasesForTask,
  listPhasesForWorkflowRun,
  updatePhase,
  updatePhaseArtifactId,
  type NewPhaseRow,
  type PhaseRow,
} from './phases.js'
export {
  getPhaseRunById,
  insertPhaseRun,
  listPhaseRunsForTask,
  listPhaseRunsForWorkflowRun,
  type NewPhaseRunRow,
  type PhaseRunRow,
} from './phase-runs.js'
export {
  getDecisionResolution,
  listDecisionResolutionsForPhase,
  listDecisionResolutionsForTask,
  upsertDecisionResolution,
  type DecisionResolutionRow,
  type NewDecisionResolutionRow,
} from './decision-resolutions.js'
export {
  insertWorkflowEvent,
  listWorkflowEventsForTask,
  type NewWorkflowEventRow,
  type WorkflowEventRow,
} from './workflow-events.js'
export {
  getRepoById,
  getRepoByPath,
  insertRepo,
  listRepos,
  type NewRepoRow,
  type RepoRow,
} from './repos.js'
export {
  getTaskById,
  insertTask,
  listSlugsForRepo,
  listTasks,
  slugExistsInRepo,
  type NewTaskRow,
  type TaskRow,
} from './tasks.js'
export { updateTask } from './tasks-update.js'
export {
  cancelWorkflowRun,
  completeWorkflowRun,
  deleteWorkflowRun,
  getActiveWorkflowRunForTask,
  getWorkflowRunById,
  insertWorkflowRun,
  listWorkflowRunsForTask,
  updateWorkflowRun,
  type NewWorkflowRunRow,
  type WorkflowRunRow,
} from './workflow-runs.js'
export {
  artifacts,
  decisionResolutions,
  phaseRuns,
  phases,
  repos,
  settings,
  tasks,
  validationRuns,
  workflowEvents,
  workflowRuns,
  workspaces,
} from './schema.js'
