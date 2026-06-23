import { cn } from '@circuit/ui'

/** +/- line counts — deletions first, then additions (matches @pierre/diffs header). */
export function DiffBadges({
  additions,
  deletions,
  className,
}: {
  additions?: number
  deletions?: number
  className?: string
}): React.ReactElement | null {
  const addCount = additions ?? 0
  const delCount = deletions ?? 0
  if (addCount <= 0 && delCount <= 0) return null

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] tabular-nums',
        className,
      )}
    >
      {delCount > 0 && (
        <span className="text-red-500 dark:text-red-400">−{delCount}</span>
      )}
      {addCount > 0 && (
        <span className="text-emerald-600 dark:text-emerald-400">+{addCount}</span>
      )}
    </span>
  )
}
