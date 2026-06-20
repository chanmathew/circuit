import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { Badge } from '@circuit/ui'
import type { ComposerMode } from '../../../../../shared/api.js'
import { useAppConfig } from '../../app/hooks/useAppConfig.js'
import { useRepos } from '../../repos/hooks/useRepos.js'
import { CircuitInputComposer } from '../../stream/CircuitInputComposer.js'
import { StreamList } from '../../stream/StreamList.js'
import { useCreateTaskFromIntake } from '../hooks/useCreateTaskFromIntake.js'

export function ComposeTaskPage({ repoId }: { repoId: string }): React.ReactElement {
  const navigate = useNavigate()
  const reposQuery = useRepos()
  const appConfig = useAppConfig()
  const createMutation = useCreateTaskFromIntake()
  const [composerMode, setComposerMode] = useState<ComposerMode>('chat')
  const [pendingText, setPendingText] = useState<string | null>(null)

  const repo = useMemo(
    () => reposQuery.data?.find((entry) => entry.id === repoId),
    [repoId, reposQuery.data],
  )

  const intakePlaceholder =
    composerMode === 'plan'
      ? 'Describe the change — Plan mode bootstraps phases and artifacts'
      : 'Message the agent — chat starts an OpenCode session on send'

  const handleSend = (text: string): void => {
    const trimmed = text.trim()
    if (!trimmed || !repoId) return

    setPendingText(trimmed)
    createMutation.mutate(
      { repoId, text: trimmed, mode: composerMode },
      {
        onSuccess: (task) => {
          setPendingText(null)
          void navigate({ to: '/tasks/$taskId', params: { taskId: task.id } })
        },
        onError: () => {
          setPendingText(null)
        },
      },
    )
  }

  if (!repoId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Choose a project</h1>
        <p className="text-sm text-muted-foreground">
          Use the + button next to a repo in the sidebar to start a new task.
        </p>
      </div>
    )
  }

  if (reposQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!repo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Project not found</h1>
        <p className="text-sm text-muted-foreground">Select another repo from the sidebar.</p>
      </div>
    )
  }

  const agentAdapter = appConfig.data?.agentAdapter ?? '…'
  const composerBusy = createMutation.isPending

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 shrink-0">
            <p className="truncate text-sm font-semibold">New task</p>
            <p className="truncate text-xs text-muted-foreground">{repo.name}</p>
          </div>
          <p className="text-xs text-muted-foreground">Describe your task in the stream below</p>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[10px] lowercase">
              {agentAdapter}
            </Badge>
          </div>
        </div>
      </header>

      {createMutation.isError && (
        <div className="shrink-0 border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {createMutation.error instanceof Error
            ? createMutation.error.message
            : 'Failed to create task'}
        </div>
      )}

      <aside className="flex min-h-0 flex-1 flex-col bg-card/30">
        <div className="shrink-0 border-b border-border px-3 py-2">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Agent stream
            </p>
          </div>
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
          <StreamList items={[]} emptyDescription={intakePlaceholder} />

          <CircuitInputComposer
            disabled={composerBusy}
            isRunning={composerBusy}
            showModeSelector
            mode={composerMode}
            onModeChange={setComposerMode}
            placeholder={intakePlaceholder}
            onSend={handleSend}
          />
        </div>
      </aside>

      {pendingText && (
        <div className="sr-only" aria-live="polite">
          Sending: {pendingText}
        </div>
      )}
    </div>
  )
}
