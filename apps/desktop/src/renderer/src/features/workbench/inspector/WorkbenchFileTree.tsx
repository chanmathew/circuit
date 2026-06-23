import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { themeToTreeStyles } from '@pierre/trees'
import { FileTree, useFileTree, useFileTreeSearch } from '@pierre/trees/react'
import { toPierreGitStatusEntries } from '@circuit/git'
import { Input, cn } from '@circuit/ui'

import { circuitApi } from '../../../ipc/client.js'
import { queryKeys } from '../../../ipc/query-keys.js'
import { useWorkspaceGitStatus } from '../../../hooks/git/useWorkspaceGitStatus.js'
import { usePierreThemeType } from '../../../lib/pierre/usePierreThemeType.js'

export interface WorkbenchFileTreeProps {
  workspacePath: string
  /** When set, skips workspace listing and uses this path list (e.g. diff slice files). */
  paths?: readonly string[]
  selectedPath?: string
  onSelectPath?: (path: string) => void
  showGitStatus?: boolean
  className?: string
  style?: React.CSSProperties
}

function WorkbenchFileTreeInner({
  paths,
  gitStatusEntries,
  selectedPath,
  onSelectPath,
  themeType,
  className,
  style,
}: {
  paths: readonly string[]
  gitStatusEntries?: ReturnType<typeof toPierreGitStatusEntries>
  selectedPath?: string
  onSelectPath?: (path: string) => void
  themeType: 'light' | 'dark'
  className?: string
  style?: React.CSSProperties
}): React.ReactElement {
  const onSelectRef = useRef(onSelectPath)
  onSelectRef.current = onSelectPath

  const filePathSet = useMemo(() => new Set(paths), [paths])

  const { model } = useFileTree({
    paths: [...paths],
    search: false,
    initialSelectedPaths: selectedPath ? [selectedPath] : [],
    onSelectionChange: (selectedPaths) => {
      const next = selectedPaths[0]
      if (!next) return
      const normalized = next.replace(/\/$/, '')
      if (!filePathSet.has(normalized)) return
      onSelectRef.current?.(normalized)
    },
  })

  const search = useFileTreeSearch(model)
  const [searchValue, setSearchValue] = useState('')

  useEffect(() => {
    setSearchValue(search.value)
  }, [search.value])

  useEffect(() => {
    model.openSearch('')
  }, [model])

  const pathsKey = paths.join('\0')
  useEffect(() => {
    model.resetPaths([...paths])
  }, [model, pathsKey])

  useEffect(() => {
    if (gitStatusEntries) {
      model.setGitStatus(gitStatusEntries)
    } else {
      model.setGitStatus(undefined)
    }
  }, [model, gitStatusEntries])

  useEffect(() => {
    if (selectedPath) {
      model.scrollToPath(selectedPath, { focus: false })
    }
  }, [model, selectedPath])

  const treeStyles = useMemo(
    () =>
      ({
        ...themeToTreeStyles({
          type: themeType,
        }),
        height: '100%',
        minHeight: 0,
        '--trees-padding-inline-override': '0px',
        '--trees-item-row-gap-override': '2px',
        '--trees-item-margin-x-override': '0px',
        '--trees-density-override': '0.85',
        ...style,
      }) as React.CSSProperties,
    [themeType, style],
  )

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-2 p-2', className)}>
      <Input
        type="text"
        role="searchbox"
        aria-label="Search files"
        value={searchValue}
        placeholder="Search…"
        className="h-7 shrink-0 text-xs"
        onChange={(event) => {
          const next = event.target.value
          setSearchValue(next)
          if (!search.isOpen) search.open('')
          search.setValue(next.length > 0 ? next : null)
        }}
      />
      <FileTree model={model} className="min-h-0 flex-1" style={treeStyles} />
    </div>
  )
}

export function WorkbenchFileTree({
  workspacePath,
  paths: pathsOverride,
  selectedPath,
  onSelectPath,
  showGitStatus = true,
  className,
  style,
}: WorkbenchFileTreeProps): React.ReactElement {
  const themeType = usePierreThemeType() as 'light' | 'dark'

  const pathsQuery = useQuery({
    queryKey: queryKeys.workspace.paths(workspacePath),
    queryFn: () => circuitApi.listWorkspacePaths({ workspacePath }),
    enabled: !pathsOverride,
  })

  const gitQuery = useWorkspaceGitStatus(workspacePath, !pathsOverride && showGitStatus)

  const paths = pathsOverride ?? pathsQuery.data ?? []
  const gitStatusEntries = useMemo(
    () => (gitQuery.data ? toPierreGitStatusEntries(gitQuery.data.changes) : undefined),
    [gitQuery.data],
  )

  if (!pathsOverride && pathsQuery.isLoading) {
    return <p className="px-2 py-4 text-xs text-muted-foreground">Loading files…</p>
  }

  if (!pathsOverride && pathsQuery.isError) {
    return (
      <p className="px-2 py-4 text-xs text-destructive">
        Failed to load workspace files.
      </p>
    )
  }

  if (paths.length === 0) {
    return <p className="px-2 py-4 text-xs text-muted-foreground">No files in workspace.</p>
  }

  return (
    <WorkbenchFileTreeInner
      paths={paths}
      gitStatusEntries={showGitStatus ? gitStatusEntries : undefined}
      selectedPath={selectedPath}
      onSelectPath={onSelectPath}
      themeType={themeType}
      className={className}
      style={style}
    />
  )
}
