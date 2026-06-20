import { Badge } from '@circuit/ui'

import { phaseStatusLabel } from '../../features/workbench/lib/phase-styles.js'
import type { PhaseStatus } from './types.js'

export function PhaseStatusBadge({
  status,
  className,
}: {
  status: PhaseStatus
  className?: string
}): React.ReactElement {
  return (
    <Badge variant="outline" className={className}>
      {phaseStatusLabel(status)}
    </Badge>
  )
}
