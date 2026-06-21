import { Button } from '@circuit/ui'
import { cn } from '@circuit/ui/utils'

import type { ArtifactDto } from '../../../../shared/api.js'

export interface ArtifactTreeProps {
  artifacts: ArtifactDto[]
  selectedId?: string
  onSelect: (id: string) => void
}

export function ArtifactTree({
  artifacts,
  selectedId,
  onSelect,
}: ArtifactTreeProps): React.ReactElement {
  const fileArtifacts = artifacts.filter((artifact) => artifact.phase !== 'ticket')

  if (fileArtifacts.length === 0) {
    return (
      <p className="px-2 py-4 text-center text-xs text-muted-foreground">
        Phase artifacts appear here after the first phase run.
      </p>
    )
  }

  return (
    <ul className="space-y-0.5">
      {fileArtifacts.map((artifact) => (
        <li key={artifact.id}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-auto w-full flex-col items-start gap-0.5 px-2 py-1.5 text-left font-normal',
              selectedId === artifact.id && 'bg-accent',
            )}
            onClick={() => onSelect(artifact.id)}
          >
            <span className="font-mono text-xs font-medium">{artifact.title}</span>
            <span className="text-[10px] capitalize text-muted-foreground">{artifact.status}</span>
          </Button>
        </li>
      ))}
    </ul>
  )
}
