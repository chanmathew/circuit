export class PhaseRunAbortedError extends Error {
  constructor() {
    super('Session aborted by user')
    this.name = 'PhaseRunAbortedError'
  }
}

export function isPhaseRunAborted(error: unknown): boolean {
  return (
    error instanceof PhaseRunAbortedError ||
    (error instanceof Error && error.message === 'Session aborted by user')
  )
}
