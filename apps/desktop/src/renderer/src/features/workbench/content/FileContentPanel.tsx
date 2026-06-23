import { useQuery } from '@tanstack/react-query'
import { File } from '@pierre/diffs/react'
import { Button } from '@circuit/ui'

import { circuitApi } from '../../../ipc/client.js'
import { queryKeys } from '../../../ipc/query-keys.js'
import { usePierreThemeType } from '../../../lib/pierre/usePierreThemeType.js'
import { usePierreFileHighlightReady } from '../../../lib/pierre/PierreHighlightProvider.js'
import { toPierreFileContents } from '../lib/pierre-file-contents.js'
import { pierreFileViewerOptions } from '../../../lib/pierre/pierre-viewer-options.js'

export interface FileContentPanelProps {
  workspacePath: string
  path: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileContentPanel({
  workspacePath,
  path,
}: FileContentPanelProps): React.ReactElement {
  const themeType = usePierreThemeType()
  const fileQuery = useQuery({
    queryKey: queryKeys.workspace.file(workspacePath, path),
    queryFn: () => circuitApi.readWorkspaceFile({ workspacePath, path }),
  })

  const file = fileQuery.data
  const pierreFile =
    file?.encoding === 'utf8' ? toPierreFileContents(path, file.content, file.size) : undefined
  const highlightReady = usePierreFileHighlightReady(pierreFile)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">File</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{path}</p>
          {file ? (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {formatFileSize(file.size)}
              {file.encoding === 'binary' ? ' · binary' : ''}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 text-xs"
          onClick={() => {
            void circuitApi.openWorkspaceFile({ workspacePath, path })
          }}
        >
          Open externally
        </Button>
      </div>

      <div className="panel-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {fileQuery.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading file…</p>
        ) : null}
        {fileQuery.isError ? (
          <p className="p-6 text-sm text-destructive">Failed to read file.</p>
        ) : null}
        {file?.encoding === 'binary' ? (
          <p className="p-6 text-sm text-muted-foreground">
            Binary file — open externally to view.
          </p>
        ) : null}
        {pierreFile && !highlightReady ? (
          <p className="p-6 text-sm text-muted-foreground">Preparing syntax highlight…</p>
        ) : null}
        {pierreFile && highlightReady ? (
          <File
            key={`${path}:${pierreFile.cacheKey}:${themeType}`}
            file={pierreFile}
            options={pierreFileViewerOptions(themeType)}
            disableWorkerPool
          />
        ) : null}
      </div>
    </div>
  )
}
