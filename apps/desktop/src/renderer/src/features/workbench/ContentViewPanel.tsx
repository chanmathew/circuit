import { useQuery } from '@tanstack/react-query'

import type { ContentView } from '@circuit/protocol'

import type { ArtifactDto, TaskDto } from '../../../../shared/api.js'
import { circuitApi } from '../../ipc/client.js'
import { queryKeys } from '../../ipc/query-keys.js'
import { ArtifactPanel } from './ArtifactPanel.js'
import { CheckContentPanel } from './content/CheckContentPanel.js'
import { DiffContentPanel } from './content/DiffContentPanel.js'
import { FileContentPanel } from './content/FileContentPanel.js'
import type { CheckEntry, DiffEntry } from './lib/workbench-content.js'
import { resolveArtifactRef, resolvePhaseArtifact } from './lib/workbench-content.js'
import { WorkflowOverviewPanel } from './WorkflowOverviewPanel.js'

export interface ContentViewPanelProps {
  contentView: ContentView
  task: TaskDto
  artifacts: ArtifactDto[]
  repoPath: string
  diffs: DiffEntry[]
  checks: CheckEntry[]
  preview: boolean
  isRunning?: boolean
  onPreviewChange: (preview: boolean) => void
}

export function ContentViewPanel({
  contentView,
  task,
  artifacts,
  repoPath,
  diffs,
  checks,
  preview,
  isRunning = false,
  onPreviewChange,
}: ContentViewPanelProps): React.ReactElement {
  switch (contentView.type) {
    case 'workflow_overview':
      return <WorkflowOverviewPanel task={task} isRunning={isRunning} />
    case 'artifact':
      return (
        <ArtifactContentView
          artifactId={contentView.artifactId}
          artifacts={artifacts}
          repoPath={repoPath}
          preview={preview}
          onPreviewChange={onPreviewChange}
        />
      )
    case 'diff':
      return <DiffContentPanel diff={diffs.find((entry) => entry.id === contentView.diffId)} />
    case 'check':
      return <CheckContentPanel check={checks.find((entry) => entry.id === contentView.checkId)} />
    case 'file':
      return <FileContentPanel path={contentView.path} />
    case 'implementation':
      return (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
          <p className="font-medium">Implementation board</p>
          <p className="mt-1">Slice {contentView.sliceId} — board view arrives in a later milestone.</p>
        </div>
      )
    case 'final_review': {
      const reviewArtifact =
        resolvePhaseArtifact(task, 'review') ?? task.artifacts.at(-1)
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <p className="text-sm font-medium">Final review</p>
            <p className="text-xs text-muted-foreground">PR summary from artifacts</p>
          </div>
          <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-6 font-mono text-xs leading-relaxed">
            {reviewArtifact?.content ?? 'No review artifact available yet.'}
          </pre>
        </div>
      )
    }
  }
}

function ArtifactContentView({
  artifactId,
  artifacts,
  repoPath,
  preview,
  onPreviewChange,
}: {
  artifactId: string
  artifacts: ArtifactDto[]
  repoPath: string
  preview: boolean
  onPreviewChange: (preview: boolean) => void
}): React.ReactElement {
  const localArtifact = resolveArtifactRef(artifacts, artifactId)
  const remoteQuery = useQuery({
    queryKey: queryKeys.artifacts.detail(artifactId),
    queryFn: () => circuitApi.getArtifact(artifactId),
    enabled: !localArtifact,
  })

  const artifact = localArtifact ?? remoteQuery.data

  if (!artifact) {
    if (remoteQuery.isLoading) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
          <p>Loading artifact…</p>
        </div>
      )
    }

    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
        <p>Artifact not found. Select one from the inspector.</p>
      </div>
    )
  }

  return (
    <ArtifactPanel
      title={artifact.title}
      relativePath={artifact.path.replace(repoPath, '.')}
      content={artifact.content}
      preview={preview}
      onPreviewChange={onPreviewChange}
    />
  )
}
