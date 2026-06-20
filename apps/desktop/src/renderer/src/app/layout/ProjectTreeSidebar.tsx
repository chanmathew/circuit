import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { Button, cn, ScrollArea } from '@circuit/ui'

import type { RepoDto, TaskSummaryDto } from '../../../../shared/api.js'
import { useAddRepo, useRepos } from '../../features/repos/hooks/useRepos.js'
import { useTasks } from '../../features/tasks/hooks/useTasks.js'
import { ThemeToggle } from './ThemeToggle.js'

/** Placeholder drafts abandoned before first message — hide from sidebar. */
function isVisibleInSidebar(task: TaskSummaryDto): boolean {
  return !(task.status === 'draft' && task.description.trim() === 'New task')
}

function ChevronIcon({ open }: { open: boolean }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn(
        'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
        open && 'rotate-90',
      )}
      fill="currentColor"
      aria-hidden
    >
      <path d="M6 4l4 4-4 4V4z" />
    </svg>
  )
}

function PlusIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M8 3v10M3 8h10" strokeLinecap="round" />
    </svg>
  )
}

export interface ProjectTreeSidebarProps {
  selectedTaskId?: string
}

export function ProjectTreeSidebar({
  selectedTaskId: selectedTaskIdProp,
}: ProjectTreeSidebarProps): React.ReactElement {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const search = useRouterState({ select: (s) => s.location.search })

  const selectedTaskId = useMemo(() => {
    if (selectedTaskIdProp) return selectedTaskIdProp
    const match = pathname.match(/^\/tasks\/([^/]+)/)
    return match?.[1]
  }, [selectedTaskIdProp, pathname])

  const composingRepoId = useMemo(() => {
    if (pathname !== '/compose') return undefined
    const repoId = (search as { repoId?: string }).repoId
    return typeof repoId === 'string' ? repoId : undefined
  }, [pathname, search])

  const reposQuery = useRepos()
  const tasksQuery = useTasks()
  const addRepoMutation = useAddRepo()

  const repos = reposQuery.data ?? []
  const tasks = (tasksQuery.data ?? []).filter(isVisibleInSidebar)

  const listError =
    reposQuery.isError || tasksQuery.isError
      ? [reposQuery.error, tasksQuery.error].find((e) => e instanceof Error)?.message ??
        'Failed to load projects'
      : null

  const tasksByRepo = useMemo(() => {
    const map = new Map<string, TaskSummaryDto[]>()
    for (const repo of repos) {
      map.set(repo.id, [])
    }
    for (const task of tasks) {
      const list = map.get(task.repoId) ?? []
      list.push(task)
      map.set(task.repoId, list)
    }
    return map
  }, [repos, tasks])

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const isExpanded = (repoId: string): boolean => expanded[repoId] ?? true

  const toggleProject = (repoId: string) => {
    setExpanded((prev) => ({ ...prev, [repoId]: !isExpanded(repoId) }))
  }

  const onNewTask = (repoId: string) => {
    void navigate({ to: '/compose', search: { repoId } })
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-3">
        <div>
          <p className="text-sm font-semibold tracking-tight">Circuit</p>
          <p className="text-[10px] text-muted-foreground">Projects</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Add repo"
          disabled={addRepoMutation.isPending}
          onClick={() => addRepoMutation.mutate()}
        >
          <PlusIcon />
        </Button>
      </div>

      <ScrollArea className="flex-1 py-2">
        <div className="space-y-1 px-2">
          {listError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {listError}
            </div>
          )}

          {repos.length === 0 && !reposQuery.isLoading && !listError && (
            <div className="rounded-md border border-dashed border-border px-3 py-4 text-center">
              <p className="text-xs text-muted-foreground">No repos yet</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={addRepoMutation.isPending}
                onClick={() => addRepoMutation.mutate()}
              >
                Add repo
              </Button>
            </div>
          )}

          {repos.map((repo) => (
            <RepoSection
              key={repo.id}
              repo={repo}
              tasks={tasksByRepo.get(repo.id) ?? []}
              open={isExpanded(repo.id)}
              selectedTaskId={selectedTaskId}
              composing={composingRepoId === repo.id}
              onToggle={() => toggleProject(repo.id)}
              onNewTask={() => onNewTask(repo.id)}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="shrink-0 space-y-1 border-t border-border px-3 py-2">
        <ThemeToggle />
        {import.meta.env.DEV && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 w-full justify-start px-2 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 hover:text-amber-800 dark:hover:text-amber-200"
          >
            <Link to="/prototype/workbench" search={{ scenario: 'early' }}>
              UX prototype
            </Link>
          </Button>
        )}
      </div>
    </aside>
  )
}

function RepoSection({
  repo,
  tasks,
  open,
  selectedTaskId,
  composing,
  onToggle,
  onNewTask,
}: {
  repo: RepoDto
  tasks: TaskSummaryDto[]
  open: boolean
  selectedTaskId?: string
  composing?: boolean
  onToggle: () => void
  onNewTask: () => void
}): React.ReactElement {
  const navigate = useNavigate()

  return (
    <div className="rounded-md">
      <div
        className={cn(
          'group flex items-center gap-0.5 rounded-md hover:bg-accent/50',
          composing && 'bg-accent/40',
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-8 w-7 shrink-0"
          onClick={onToggle}
          aria-label={open ? 'Collapse project' : 'Expand project'}
        >
          <ChevronIcon open={open} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-w-0 flex-1 justify-start truncate px-1 text-xs font-medium"
          title={repo.path}
          onClick={onToggle}
        >
          {repo.name}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100"
          title="New task"
          onClick={(e) => {
            e.stopPropagation()
            onNewTask()
          }}
        >
          <PlusIcon />
        </Button>
      </div>

      {open && (
        <div className="ml-3 border-l border-border pl-2 pb-1">
          {composing && (
            <div className="px-2 py-1.5 text-[10px] font-medium text-primary">New task…</div>
          )}
          {tasks.map((task) => {
            const selected = task.id === selectedTaskId
            return (
              <Button
                key={task.id}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'h-auto w-full flex-col items-start gap-0.5 px-2 py-1.5 text-left font-normal',
                  selected && 'bg-accent text-accent-foreground hover:bg-accent',
                )}
                onClick={() =>
                  void navigate({ to: '/tasks/$taskId', params: { taskId: task.id } })
                }
              >
                <span className="truncate text-xs font-medium">{task.title}</span>
                <span className="truncate text-[10px] text-muted-foreground capitalize">
                  {task.currentPhase} · {task.status.replace(/_/g, ' ')}
                </span>
              </Button>
            )
          })}
          {tasks.length === 0 && !composing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto w-full justify-start px-2 py-1.5 text-[10px] text-muted-foreground"
              onClick={onNewTask}
            >
              + New task
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
