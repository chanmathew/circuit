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

/** Poll until an in-flight harness run releases its lock (after abort). */
export async function waitForPhaseRunLockRelease(
  taskId: string,
  timeoutMs = 15_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (isPhaseRunLocked(taskId)) {
    if (Date.now() >= deadline) return false
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  return true
}
