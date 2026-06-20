import {
  createRootRoute,
  createRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@circuit/ui'
import { autoSelectWorkflow, getWorkflowDefinition } from '@circuit/workflow'

import { ProjectTreeSidebar } from './components/ProjectTreeSidebar.js'
import { TaskWorkbench } from './components/TaskWorkbench.js'
import {
  WorkbenchPrototypePage,
  parseScenario,
  type WorkbenchPrototypeSearch,
} from './prototype/workbench/WorkbenchPrototypePage.js'

function AppShell(): React.ReactElement {
  const isPrototype = useRouterState({
    select: (s) => s.location.pathname.startsWith('/prototype/'),
  })

  if (isPrototype) {
    return (
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <ProjectTreeSidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}

const rootRoute = createRootRoute({
  component: AppShell,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})

const newTaskRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/new-task',
  validateSearch: (search: Record<string, unknown>): { repoId?: string } => ({
    repoId: typeof search.repoId === 'string' ? search.repoId : undefined,
  }),
  component: NewTaskPage,
})

const taskDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tasks/$taskId',
  component: TaskDetailPage,
})

const workbenchPrototypeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/prototype/workbench',
  validateSearch: (search: Record<string, unknown>): WorkbenchPrototypeSearch => ({
    scenario: parseScenario(search.scenario),
  }),
  component: WorkbenchPrototypeRoutePage,
})

function WorkbenchPrototypeRoutePage(): React.ReactElement {
  const { scenario } = workbenchPrototypeRoute.useSearch()
  return <WorkbenchPrototypePage scenario={scenario} />
}

function DashboardPage(): React.ReactElement {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Select a task</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Choose a task from the project tree, or use + on a repo to start a new one.
      </p>
    </div>
  )
}

function NewTaskPage(): React.ReactElement {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { repoId: repoIdFromSearch } = newTaskRoute.useSearch()
  const [description, setDescription] = useState('')
  const [repoId, setRepoId] = useState('')

  const reposQuery = useQuery({
    queryKey: ['repos'],
    queryFn: () => window.circuit.listRepos(),
  })

  const repos = reposQuery.data ?? []

  useEffect(() => {
    if (repoIdFromSearch && repos.some((r) => r.id === repoIdFromSearch)) {
      setRepoId(repoIdFromSearch)
    } else if (!repoId && repos.length > 0) {
      setRepoId(repos[0]?.id ?? '')
    }
  }, [repoIdFromSearch, repoId, repos])

  const preview = description.trim()
    ? autoSelectWorkflow(description)
    : autoSelectWorkflow('placeholder')
  const previewWorkflow = getWorkflowDefinition(preview.workflowType)

  const createTaskMutation = useMutation({
    mutationFn: () =>
      window.circuit.createTask({
        repoId,
        description: description.trim(),
      }),
    onSuccess: (task) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] })
      void navigate({ to: '/tasks/$taskId', params: { taskId: task.id } })
    },
  })

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Task</h1>
        <p className="text-sm text-muted-foreground">Describe what the agent should work on.</p>
      </div>

      {repos.length === 0 ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Add a repo first</CardTitle>
            <CardDescription>
              Use the + button in the project tree to register a local git repository.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="max-w-lg border-border/50 shadow-none">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle>What should the agent work on?</CardTitle>
            <CardDescription>
              Approach: Auto · {previewWorkflow?.label ?? preview.workflowType} · Workspace:{' '}
              {preview.workspaceStrategy === 'git-worktree'
                ? 'Isolated branch'
                : preview.workspaceStrategy}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid gap-2">
              <Label htmlFor="repo">Repo</Label>
              <Select value={repoId || undefined} onValueChange={setRepoId}>
                <SelectTrigger id="repo">
                  <SelectValue placeholder="Select a repo" />
                </SelectTrigger>
                <SelectContent>
                  {repos.map((repo) => (
                    <SelectItem key={repo.id} value={repo.id}>
                      {repo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the task…"
                className="min-h-[160px]"
              />
            </div>

            {createTaskMutation.isError && (
              <p className="text-sm text-destructive">
                {createTaskMutation.error instanceof Error
                  ? createTaskMutation.error.message
                  : 'Failed to create task'}
              </p>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={() => createTaskMutation.mutate()}
                disabled={!description.trim() || !repoId || createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? 'Starting…' : 'Start task'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TaskDetailPage(): React.ReactElement {
  const { taskId } = taskDetailRoute.useParams()
  const queryClient = useQueryClient()

  const taskQuery = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => window.circuit.getTask(taskId),
  })

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['tasks', taskId] })
    void queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }

  const workflowMutation = useMutation({
    mutationFn: async (action: {
      type: 'run' | 'approve' | 'revise' | 'resolve'
      phaseName: string
      note?: string
      decisionId?: string
      optionId?: string
      optionLabel?: string
    }) => {
      if (action.type === 'run') {
        return window.circuit.runPhase({ taskId, phaseName: action.phaseName })
      }
      if (action.type === 'approve') {
        return window.circuit.approvePhase({ taskId, phaseName: action.phaseName })
      }
      if (action.type === 'resolve') {
        return window.circuit.resolveDecision({
          taskId,
          phase: action.phaseName,
          decisionId: action.decisionId ?? '',
          optionId: action.optionId ?? '',
          optionLabel: action.optionLabel ?? '',
        })
      }
      return window.circuit.requestPhaseRevision({
        taskId,
        phaseName: action.phaseName,
        note: action.note ?? '',
      })
    },
    onSuccess: invalidate,
  })

  if (taskQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Loading task…
      </div>
    )
  }

  if (taskQuery.isError || !taskQuery.data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Task not found</h1>
        <p className="text-sm text-muted-foreground">Select another task from the project tree.</p>
      </div>
    )
  }

  const task = taskQuery.data

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {workflowMutation.isError && (
        <Card className="shrink-0 rounded-none border-x-0 border-t-0 border-destructive/30 bg-destructive/5 shadow-none">
          <CardContent className="py-2 text-sm text-destructive">
            {workflowMutation.error instanceof Error
              ? workflowMutation.error.message
              : 'Workflow action failed'}
          </CardContent>
        </Card>
      )}

      <TaskWorkbench
        task={task}
        isRunning={workflowMutation.isPending}
        onRunPhase={(phaseName) => workflowMutation.mutate({ type: 'run', phaseName })}
        onApprovePhase={(phaseName) => workflowMutation.mutate({ type: 'approve', phaseName })}
        onRequestRevision={(phaseName, note) =>
          workflowMutation.mutate({ type: 'revise', phaseName, note })
        }
        onResolveDecision={(phase, decisionId, optionId, optionLabel) =>
          workflowMutation.mutate({
            type: 'resolve',
            phaseName: phase,
            decisionId,
            optionId,
            optionLabel,
          })
        }
      />
    </div>
  )
}

export const routeTree = rootRoute.addChildren([
  indexRoute,
  newTaskRoute,
  taskDetailRoute,
  workbenchPrototypeRoute,
])
