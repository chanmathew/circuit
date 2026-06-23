import { DEFAULT_TASK_MODE, type TaskMode } from '@circuit/workflow'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

import { useAddRepo, useRepos } from '../../repos/hooks/useRepos.js'
import { CircuitInputComposer } from '../../composer/CircuitInputComposer.js'
import { StreamList } from '../../stream/StreamList.js'
import { resolveRepoId, writeLastRepoId } from '../../../lib/last-repo-id.js'
import { useCreateTaskFromIntake } from '../hooks/useCreateTaskFromIntake.js'

export function ComposeTaskPage({ repoId: urlRepoId }: { repoId?: string }): React.ReactElement {
  const navigate = useNavigate()
  const reposQuery = useRepos()
  const addRepoMutation = useAddRepo()
  const createMutation = useCreateTaskFromIntake()
  const [pendingText, setPendingText] = useState<string | null>(null)
  const [taskMode, setTaskMode] = useState<TaskMode>(DEFAULT_TASK_MODE)

  const repos = reposQuery.data ?? []
  const resolvedRepoId = useMemo(
    () => resolveRepoId(repos, urlRepoId),
    [repos, urlRepoId],
  )

  useEffect(() => {
    if (!resolvedRepoId || resolvedRepoId === urlRepoId) return
    void navigate({ to: '/compose', search: { repoId: resolvedRepoId }, replace: true })
  }, [navigate, resolvedRepoId, urlRepoId])

  const intakePlaceholder = 'Message the agent — chat starts an OpenCode session on send'

  const handleRepoChange = (repoId: string): void => {
    writeLastRepoId(repoId)
    void navigate({ to: '/compose', search: { repoId }, replace: true })
  }

  const handleSend = (text: string): void => {
    const trimmed = text.trim()
    if (!trimmed || !resolvedRepoId) return

    setPendingText(trimmed)
    createMutation.mutate(
      { repoId: resolvedRepoId, text: trimmed, taskMode },
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

  const composerBusy = createMutation.isPending

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {createMutation.isError && (
        <div className="shrink-0 border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {createMutation.error instanceof Error
            ? createMutation.error.message
            : 'Failed to create task'}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col bg-card/30">
        <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
          <StreamList items={[]} emptyDescription={intakePlaceholder} />
          <CircuitInputComposer
            disabled={composerBusy || reposQuery.isLoading}
            isRunning={composerBusy}
            placeholder={intakePlaceholder}
            repos={repos}
            repoId={resolvedRepoId}
            onRepoChange={handleRepoChange}
            onAddRepo={() => addRepoMutation.mutate()}
            taskMode={taskMode}
            onTaskModeChange={setTaskMode}
            onSend={handleSend}
          />
        </div>
      </div>

      {pendingText && (
        <div className="sr-only" aria-live="polite">
          Sending: {pendingText}
        </div>
      )}
    </div>
  )
}
