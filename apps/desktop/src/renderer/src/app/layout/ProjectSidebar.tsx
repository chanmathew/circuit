import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  Folder01Icon,
  Folder02Icon,
  Loading03Icon,
  SquarePen,
} from '@hugeicons/core-free-icons'
import { useMemo, useState } from 'react'

import {
    Button,
  cn,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@circuit/ui'

import { formatWorkflowSubtitle } from '../../../../shared/workflow-status.js'
import type { RepoDto, TaskSummaryDto } from '../../../../shared/api.js'
import { formatRelativeAge } from '../../lib/format-relative-age.js'
import { useAddRepo, useRepos } from '../../features/repos/hooks/useRepos.js'
import { useTasks } from '../../features/tasks/hooks/useTasks.js'
import { ThemeToggle } from './ThemeToggle.js'

const TASKS_PREVIEW_LIMIT = 5

/** Full-width task rows; label truncates, timestamp (or spinner) stays visible on the right. */
const TASK_ROW_CLASS =
  'w-full min-w-0 cursor-pointer justify-between gap-2 pr-1 [&>span:last-child]:shrink-0 [&>span:last-child]:truncate-none'

const TASK_LIST_CLASS =
  'ml-3.5 mr-0 w-[calc(100%-0.875rem)] translate-x-px border-l border-sidebar-border py-0.5 pl-2.5 pr-0 gap-0'

function isTaskRunning(task: TaskSummaryDto): boolean {
  return task.status === 'running'
}

/** Placeholder drafts abandoned before first message — hide from sidebar. */
function isVisibleInSidebar(task: TaskSummaryDto): boolean {
  return !(task.status === 'draft' && task.description.trim() === 'New task')
}

export interface ProjectSidebarProps {
  selectedTaskId?: string
}

export function ProjectSidebar({
  selectedTaskId: selectedTaskIdProp,
}: ProjectSidebarProps): React.ReactElement {
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
  const [showAllTasks, setShowAllTasks] = useState<Record<string, boolean>>({})

  const isExpanded = (repoId: string): boolean => expanded[repoId] ?? true

  const onNewTask = (repoId?: string) => {
    void navigate({
      to: '/compose',
      search: repoId ? { repoId } : {},
    })
  }

  return (
    <Sidebar collapsible="none" className="h-full w-full min-w-0 border-r-0">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="sm"
                  isActive={pathname === '/compose' && composingRepoId == null}
                  onClick={() => onNewTask()}
                >
                  <HugeiconsIcon icon={SquarePen} strokeWidth={2} />
                  <span>New task</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupAction
            title="Add repo"
            aria-label="Add repo"
            disabled={addRepoMutation.isPending}
            onClick={() => addRepoMutation.mutate()}
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          </SidebarGroupAction>
          <SidebarGroupContent>
            {listError && (
              <div className="mx-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {listError}
              </div>
            )}

            {repos.length === 0 && !reposQuery.isLoading && !listError && (
              <div className="mx-2 rounded-md border border-dashed border-border px-3 py-4 text-center">
                <p className="text-xs text-muted-foreground">No repos yet</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7"
                  disabled={addRepoMutation.isPending}
                  onClick={() => addRepoMutation.mutate()}
                >
                  Add repo
                </Button>
              </div>
            )}

            <SidebarMenu>
              {repos.map((repo) => (
                <RepoSection
                  key={repo.id}
                  repo={repo}
                  tasks={tasksByRepo.get(repo.id) ?? []}
                  open={isExpanded(repo.id)}
                  showAll={showAllTasks[repo.id] ?? false}
                  selectedTaskId={selectedTaskId}
                  composing={composingRepoId === repo.id}
                  onOpenChange={(nextOpen) =>
                    setExpanded((prev) => ({ ...prev, [repo.id]: nextOpen }))
                  }
                  onShowAll={() =>
                    setShowAllTasks((prev) => ({ ...prev, [repo.id]: true }))
                  }
                  onNewTask={() => onNewTask(repo.id)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <ThemeToggle />
        {import.meta.env.DEV && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="sm"
                className="text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 hover:text-amber-800 dark:hover:text-amber-200"
              >
                <Link to="/prototype/workbench" search={{ scenario: 'early' }}>
                  UX prototype
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}

function RepoSection({
  repo,
  tasks,
  open,
  showAll,
  selectedTaskId,
  composing,
  onOpenChange,
  onShowAll,
  onNewTask,
}: {
  repo: RepoDto
  tasks: TaskSummaryDto[]
  open: boolean
  showAll: boolean
  selectedTaskId?: string
  composing?: boolean
  onOpenChange: (open: boolean) => void
  onShowAll: () => void
  onNewTask: () => void
}): React.ReactElement {
  const navigate = useNavigate()
  const visibleTasks = showAll ? tasks : tasks.slice(0, TASKS_PREVIEW_LIMIT)
  const hiddenCount = tasks.length - visibleTasks.length
  const hasSelectedTask =
    selectedTaskId != null && tasks.some((task) => task.id === selectedTaskId)
  const isProjectHighlighted = composing || hasSelectedTask

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size="sm"
        tooltip={repo.path}
        isActive={composing}
        className={cn(
          'group/repo',
          !isProjectHighlighted && 'text-muted-foreground hover:text-foreground/80',
        )}
        onClick={() => onOpenChange(!open)}
      >
        {open ? (
          <HugeiconsIcon icon={Folder02Icon} strokeWidth={2} />
        ) : (
          <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
        )}
        <span className="truncate">{repo.name}</span>
      </SidebarMenuButton>
      <SidebarMenuAction
        showOnHover
        title="New task"
        onClick={(event) => {
          event.stopPropagation()
          onNewTask()
        }}
      >
        <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
      </SidebarMenuAction>
      {open ? (
        <SidebarMenuSub className={TASK_LIST_CLASS}>
            {composing && (
              <SidebarMenuSubItem className="w-full">
                <SidebarMenuSubButton size="sm" isActive className={TASK_ROW_CLASS}>
                  New task…
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )}
            {visibleTasks.map((task) => {
              const subtitle = formatWorkflowSubtitle({
                workflowStatus: task.workflowStatus,
                workflowType: task.workflowType,
                currentPhase: task.currentPhase,
                phases: [],
              })
              const isSelected = task.id === selectedTaskId

              return (
                <SidebarMenuSubItem key={task.id} className="w-full">
                  <SidebarMenuSubButton
                    asChild
                    size="sm"
                    isActive={isSelected}
                    className={cn(
                      TASK_ROW_CLASS,
                      !isSelected && 'text-muted-foreground hover:text-foreground/80',
                    )}
                  >
                    <button
                      type="button"
                      title={subtitle ? `${task.title}\n${subtitle}` : task.title}
                      onClick={() =>
                        void navigate({ to: '/tasks/$taskId', params: { taskId: task.id } })
                      }
                    >
                      <span className="min-w-0 flex-1 truncate text-left">{task.title}</span>
                      {isTaskRunning(task) ? (
                        <HugeiconsIcon
                          icon={Loading03Icon}
                          strokeWidth={2}
                          className={cn(
                            'size-3 shrink-0 animate-spin',
                            isSelected ? 'text-primary' : 'text-muted-foreground/70',
                          )}
                          aria-hidden
                        />
                      ) : (
                        <span
                          className={cn(
                            'shrink-0 text-xs tabular-nums',
                            isSelected ? 'text-muted-foreground' : 'text-muted-foreground/70',
                          )}
                        >
                          {formatRelativeAge(task.updatedAt)}
                        </span>
                      )}
                    </button>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
            {!showAll && hiddenCount > 0 && (
              <SidebarMenuSubItem className="w-full">
                <SidebarMenuSubButton
                  size="sm"
                  className={cn(TASK_ROW_CLASS, 'text-muted-foreground')}
                  onClick={onShowAll}
                >
                  Show more
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )}
            {tasks.length === 0 && !composing && (
              <SidebarMenuSubItem className="w-full">
                <SidebarMenuSubButton
                  size="sm"
                  className={cn(TASK_ROW_CLASS, 'text-muted-foreground')}
                  onClick={onNewTask}
                >
                  + New task
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )}
          </SidebarMenuSub>
      ) : null}
    </SidebarMenuItem>
  )
}
