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
