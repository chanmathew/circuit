/** Heuristic: chat during needs_review that should trigger phase revision (not Q&A). */
export function isRevisionFeedback(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  return !trimmed.endsWith('?')
}
