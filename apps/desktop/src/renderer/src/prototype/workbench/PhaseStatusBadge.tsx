import { cn } from '@circuit/ui'

import { PHASE_STATUS_STYLES, phaseStatusLabel } from './phase-styles.js'
import type { PhaseStatus } from './types.js'

export function PhaseStatusBadge({
  status,
  className,
}: {
  status: PhaseStatus
  className?: string
}): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        PHASE_STATUS_STYLES[status],
        className,
      )}
    >
      {phaseStatusLabel(status)}
    </span>
  )
}
