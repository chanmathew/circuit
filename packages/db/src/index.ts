export { createDb, type CircuitDb } from './client.js'
export { migrateDb } from './migrate.js'
export {
  getArtifactById,
  getTicketArtifactForTask,
  insertArtifact,
  type ArtifactRow,
  type NewArtifactRow,
} from './artifacts.js'
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
