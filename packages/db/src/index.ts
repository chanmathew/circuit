export { createDb, type CircuitDb } from './client.js'
export { migrateDb } from './migrate.js'
export {
  getArtifactById,
  getArtifactByTaskAndPhase,
  getTicketArtifactForTask,
  insertArtifact,
  listArtifactsForTask,
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
  updatePhase,
  updatePhaseArtifactId,
  type NewPhaseRow,
  type PhaseRow,
} from './phases.js'
export {
  getPhaseRunById,
  insertPhaseRun,
  listPhaseRunsForTask,
  type NewPhaseRunRow,
  type PhaseRunRow,
} from './phase-runs.js'
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
  artifacts,
  phaseRuns,
  phases,
  repos,
  settings,
  tasks,
  validationRuns,
  workspaces,
} from './schema.js'
