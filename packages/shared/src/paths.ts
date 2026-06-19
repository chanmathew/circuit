import path from 'node:path'

export const CIRCUIT_DIR = '.Circuit'
export const TASKS_DIR = 'tasks'

export function taskDir(repoPath: string, slug: string): string {
  return path.join(repoPath, CIRCUIT_DIR, TASKS_DIR, slug)
}

export function artifactPath(repoPath: string, slug: string, filename: string): string {
  return path.join(taskDir(repoPath, slug), filename)
}

export const ARTIFACT_FILES = [
  '00-ticket.md',
  '01-questions.md',
  '02-research.md',
  '03-design.md',
  '04-structure.md',
  '05-plan.md',
  '06-implementation-log.md',
  '07-review.md',
] as const

export type ArtifactFilename = (typeof ARTIFACT_FILES)[number]
