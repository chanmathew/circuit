/** Compact relative age label for sidebar rows (e.g. 1d, 3w, 1mo). */
export function formatRelativeAge(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime()
  if (Number.isNaN(ms) || ms < 0) return ''

  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${Math.max(1, minutes)}m`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w`

  const months = Math.floor(days / 30)
  return `${Math.max(1, months)}mo`
}
