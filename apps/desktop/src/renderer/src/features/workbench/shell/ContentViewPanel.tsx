import { useQuery } from '@tanstack/react-query'

import type { ContentView } from '@circuit/protocol'

import type { ArtifactDto, TaskDto } from '../../../../../shared/api.js'
import { circuitApi } from '../../../ipc/client.js'
import { queryKeys } from '../../../ipc/query-keys.js'
import { ArtifactPanel } from '../ArtifactPanel.js'
import { CheckContentPanel } from '../content/CheckContentPanel.js'
import { DiffContentPanel } from '../diff/DiffContentPanel.js'
import { FileContentPanel } from '../content/FileContentPanel.js'
import type { CheckEntry, DiffEntry } from '../navigation/workbench-content.js'
import {
  resolveArtifactRef,
  resolvePhaseArtifact,
  resolveDiffEntry,
  WORKSPACE_DIFF_ID,
} from '../navigation/workbench-content.js'
import { WorkflowOverviewPanel } from '../workflow/WorkflowOverviewPanel.js'

export interface ContentViewPanelProps {
  contentView: ContentView
  task: TaskDto
  artifacts: ArtifactDto[]
  repoPath: string
  workspacePath: string
  diffs: DiffEntry[]
  checks: CheckEntry[]
  allChangedPaths?: string[]
  orderedPaths?: string[]
  preview: boolean
  isRunning?: boolean
  onPreviewChange: (preview: boolean) => void
  onSelectDiffPath?: (diffId: string, path: string) => void
  onSelectFile?: (path: string) => void
}

export function ContentViewPanel({
  contentView,
  task,
  artifacts,
  repoPath,
  workspacePath,
  diffs,
  checks,
  allChangedPaths = [],
  orderedPaths = [],
  preview,
  isRunning = false,
  onPreviewChange,
  onSelectDiffPath,
  onSelectFile,
}: ContentViewPanelProps): React.ReactElement {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ContentViewBody
        contentView={contentView}
        task={task}
        artifacts={artifacts}
        repoPath={repoPath}
        workspacePath={workspacePath}
        diffs={diffs}
        checks={checks}
        allChangedPaths={allChangedPaths}
        orderedPaths={orderedPaths}
        preview={preview}
        isRunning={isRunning}
        onPreviewChange={onPreviewChange}
        onSelectDiffPath={onSelectDiffPath}
        onSelectFile={onSelectFile}
      />
    </div>
  )
}

function ContentViewBody({
  contentView,
  task,
  artifacts,
  repoPath,
  workspacePath,
  diffs,
  checks,
  allChangedPaths = [],
  orderedPaths = [],
  preview,
  isRunning = false,
  onPreviewChange,
  onSelectDiffPath,
  onSelectFile,
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
    case 'diff': {
      const diff = resolveDiffEntry(contentView.diffId, diffs, contentView.path, allChangedPaths)
      const isWorkspaceDiff = contentView.diffId === WORKSPACE_DIFF_ID
      return (
        <DiffContentPanel
          workspacePath={workspacePath}
          diff={diff}
          selectedPath={isWorkspaceDiff ? undefined : contentView.path}
          focusPath={isWorkspaceDiff ? contentView.path : undefined}
          orderedPaths={isWorkspaceDiff ? orderedPaths : undefined}
          onSelectPath={
            onSelectDiffPath && diff ? (path) => onSelectDiffPath(diff.id, path) : undefined
          }
          onOpenFile={onSelectFile}
        />
      )
    }
    case 'check':
      return <CheckContentPanel check={checks.find((entry) => entry.id === contentView.checkId)} />
    case 'file':
      return <FileContentPanel workspacePath={workspacePath} path={contentView.path} />
    case 'implementation':
      return (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
          <p className="font-medium">Implementation board</p>
          <p className="mt-1">
            Slice {contentView.sliceId} — board view arrives in a later milestone.
          </p>
        </div>
      )
    case 'final_review': {
      const reviewArtifact = resolvePhaseArtifact(task, 'review') ?? task.artifacts.at(-1)
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
