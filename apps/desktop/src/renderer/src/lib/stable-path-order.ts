/** Preserve first-seen order; append new paths alphabetically at the end. */
export function mergeStablePathOrder(
  stableOrder: readonly string[],
  currentPaths: readonly string[],
): string[] {
  const currentSet = new Set(currentPaths)
  const next = stableOrder.filter((path) => currentSet.has(path))
  const known = new Set(next)
  const added = currentPaths
    .filter((path) => !known.has(path))
    .sort((a, b) => a.localeCompare(b))
  return [...next, ...added]
}
