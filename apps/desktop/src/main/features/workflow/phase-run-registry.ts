const abortBySessionId = new Map<string, () => void>()
const sessionTaskById = new Map<string, string>()

export function registerSessionAbort(
  sessionId: string,
  taskId: string,
  abortRun: () => void,
): void {
  abortBySessionId.set(sessionId, abortRun)
  sessionTaskById.set(sessionId, taskId)
}

export function unregisterSessionAbort(sessionId: string): void {
  abortBySessionId.delete(sessionId)
  sessionTaskById.delete(sessionId)
}

export function getSessionTaskId(sessionId: string): string | undefined {
  return sessionTaskById.get(sessionId)
}

/** Reject the in-flight adapter run — called before OpenCode session.abort. */
export function signalSessionAbort(sessionId: string): void {
  abortBySessionId.get(sessionId)?.()
}

export function getSessionIdsForTask(taskId: string): string[] {
  const sessionIds: string[] = []
  for (const [sessionId, boundTaskId] of sessionTaskById) {
    if (boundTaskId === taskId) {
      sessionIds.push(sessionId)
    }
  }
  return sessionIds
}

/** Abort all in-flight harness runs for a task; returns session ids signalled. */
export function signalTaskAbort(taskId: string): string[] {
  const sessionIds = getSessionIdsForTask(taskId)
  for (const sessionId of sessionIds) {
    signalSessionAbort(sessionId)
  }
  return sessionIds
}
