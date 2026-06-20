const locks = new Set<string>()

/** Returns false when a phase run is already active for this task. */
export function acquirePhaseRunLock(taskId: string): boolean {
  if (locks.has(taskId)) return false
  locks.add(taskId)
  return true
}

export function releasePhaseRunLock(taskId: string): void {
  locks.delete(taskId)
}

export function isPhaseRunLocked(taskId: string): boolean {
  return locks.has(taskId)
}
