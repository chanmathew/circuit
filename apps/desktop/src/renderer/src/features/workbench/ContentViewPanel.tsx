import type { ContentView } from '@circuit/protocol'

import type { ArtifactDto } from '../../../../shared/api.js'
import { ArtifactPanel } from './ArtifactPanel.js'
import { CheckContentPanel } from './content/CheckContentPanel.js'
import { DiffContentPanel } from './content/DiffContentPanel.js'
import { FileContentPanel } from './content/FileContentPanel.js'
import type { CheckEntry, DiffEntry } from './lib/workbench-content.js'
import { resolveArtifactRef } from './lib/workbench-content.js'

export interface ContentViewPanelProps {
  contentView: ContentView
  artifacts: ArtifactDto[]
  repoPath: string
  diffs: DiffEntry[]
  checks: CheckEntry[]
  preview: boolean
  onPreviewChange: (preview: boolean) => void
}

export function ContentViewPanel({
  contentView,
  artifacts,
  repoPath,
  diffs,
  checks,
  preview,
  onPreviewChange,
}: ContentViewPanelProps): React.ReactElement {
  switch (contentView.type) {
    case 'artifact': {
      const artifact = resolveArtifactRef(artifacts, contentView.artifactId)
      if (!artifact) {
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
        artifacts.find((artifact) => artifact.phase === 'review') ?? artifacts.at(-1)
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
