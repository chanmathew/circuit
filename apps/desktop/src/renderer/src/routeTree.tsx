import {
  createRootRoute,
  createRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScrollArea,
  Separator,
  Textarea,
} from '@circuit/ui'
import { autoSelectWorkflow, getWorkflowDefinition } from '@circuit/workflow'

import type { RepoDto, TaskSummaryDto } from '../../shared/api.js'
import type { WorkflowType } from '@circuit/workflow'
import { TaskWorkbench } from './components/TaskWorkbench.js'
import {
  WorkbenchPrototypePage,
  parseScenario,
  type WorkbenchPrototypeSearch,
} from './prototype/workbench/WorkbenchPrototypePage.js'

function AppShell(): React.ReactElement {
  const [pingResult, setPingResult] = useState<string>('…')
  const isPrototype = useRouterState({
    select: (s) => s.location.pathname.startsWith('/prototype/'),
  })

  useEffect(() => {
    window.circuit
      .ping()
      .then(setPingResult)
      .catch(() => setPingResult('error'))
  }, [])

  if (isPrototype) {
    return (
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-4 py-5">
          <p className="text-lg font-semibold tracking-tight">Circuit</p>
          <p className="text-xs text-muted-foreground">Structured agent workspaces</p>
        </div>
        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="flex flex-col gap-1">
            <Link
              to="/"
              className="rounded-md px-3 py-2 text-sm hover:bg-accent [&.active]:bg-accent"
            >
              Dashboard
            </Link>
            <Link
              to="/new-task"
              className="rounded-md px-3 py-2 text-sm hover:bg-accent [&.active]:bg-accent"
            >
              New Task
            </Link>
            {import.meta.env.DEV && (
              <Link
                to="/prototype/workbench"
                search={{ scenario: 'early' }}
                className="rounded-md px-3 py-2 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 [&.active]:bg-amber-500/15"
              >
                UX Prototype
              </Link>
            )}
          </nav>
        </ScrollArea>
        <div className="border-t border-border px-4 py-3">
          <Badge variant="secondary">IPC: {pingResult}</Badge>
        </div>
      </aside>
      <main className="flex flex-1 flex-col min-h-0 overflow-hidden">
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
  const queryClient = useQueryClient()

  const reposQuery = useQuery({
    queryKey: ['repos'],
    queryFn: () => window.circuit.listRepos(),
  })

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: () => window.circuit.listTasks(),
  })

  const addRepoMutation = useMutation({
    mutationFn: () => window.circuit.addRepo(),
    onSuccess: (repo) => {
      if (repo) {
        void queryClient.invalidateQueries({ queryKey: ['repos'] })
      }
    },
  })

  const repos = reposQuery.data ?? []
  const tasks = tasksQuery.data ?? []

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Task Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {repos.length === 0
              ? 'No repos registered yet. Add a repo to start structured agent work.'
              : `${repos.length} repo${repos.length === 1 ? '' : 's'} · ${tasks.length} task${tasks.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Button onClick={() => addRepoMutation.mutate()} disabled={addRepoMutation.isPending}>
          {addRepoMutation.isPending ? 'Adding…' : 'Add repo'}
        </Button>
      </div>

      {addRepoMutation.isError && (
        <p className="text-sm text-destructive">
          {addRepoMutation.error instanceof Error
            ? addRepoMutation.error.message
            : 'Failed to add repo'}
        </p>
      )}

      {repos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Registered repos</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {repos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        </section>
      )}

      {tasks.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Active tasks</h2>
            <Link to="/new-task">
              <Button variant="outline" size="sm">
                New task
              </Button>
            </Link>
          </div>
          <div className="grid gap-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Getting started</CardTitle>
            <CardDescription>
              Circuit runs AI coding agents through reviewable development workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add a local git repo, then create a task from a single description. Circuit writes{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                .Circuit/tasks/&lt;slug&gt;/00-ticket.md
              </code>{' '}
              in the repo.
            </p>
            <Separator />
            {repos.length > 0 ? (
              <Link to="/new-task">
                <Button>New task</Button>
              </Link>
            ) : (
              <Button onClick={() => addRepoMutation.mutate()} disabled={addRepoMutation.isPending}>
                Add your first repo
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function RepoCard({ repo }: { repo: RepoDto }): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{repo.name}</CardTitle>
        <CardDescription className="truncate font-mono text-xs">{repo.path}</CardDescription>
      </CardHeader>
      <CardContent>
        <Badge variant="secondary">default: {repo.defaultBranch}</Badge>
      </CardContent>
    </Card>
  )
}

function TaskCard({ task }: { task: TaskSummaryDto }): React.ReactElement {
  const workflow = getWorkflowDefinition(task.workflowType as WorkflowType)

  return (
    <Link to="/tasks/$taskId" params={{ taskId: task.id }}>
      <Card className="transition-colors hover:bg-accent/40">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base">{task.title}</CardTitle>
            <Badge variant="outline">{task.status}</Badge>
          </div>
          <CardDescription>
            {task.repoName} · {workflow?.label ?? task.workflowType} · phase: {task.currentPhase}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{task.branchName}</span>
          <span>·</span>
          <span>updated {new Date(task.updatedAt).toLocaleString()}</span>
        </CardContent>
      </Card>
    </Link>
  )
}

function NewTaskPage(): React.ReactElement {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [description, setDescription] = useState('')
  const [repoId, setRepoId] = useState('')

  const reposQuery = useQuery({
    queryKey: ['repos'],
    queryFn: () => window.circuit.listRepos(),
  })

  const repos = reposQuery.data ?? []

  useEffect(() => {
    if (!repoId && repos.length > 0) {
      setRepoId(repos[0]?.id ?? '')
    }
  }, [repoId, repos])

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
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Task</h1>
        <p className="text-sm text-muted-foreground">Describe what the agent should work on.</p>
      </div>

      {repos.length === 0 ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Add a repo first</CardTitle>
            <CardDescription>
              Register a local git repository from the dashboard before creating a task.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>What should the agent work on?</CardTitle>
            <CardDescription>
              Approach: Auto · {previewWorkflow?.label ?? preview.workflowType} · Workspace:{' '}
              {preview.workspaceStrategy === 'git-worktree'
                ? 'Isolated branch'
                : preview.workspaceStrategy}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="repo" className="text-sm font-medium">
                Repo
              </label>
              <select
                id="repo"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={repoId}
                onChange={(event) => setRepoId(event.target.value)}
              >
                {repos.map((repo) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.name}
                  </option>
                ))}
              </select>
            </div>

            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the task…"
              className="min-h-[160px]"
            />

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
      type: 'run' | 'approve' | 'revise'
      phaseName: string
      note?: string
    }) => {
      if (action.type === 'run') {
        return window.circuit.runPhase({ taskId, phaseName: action.phaseName })
      }
      if (action.type === 'approve') {
        return window.circuit.approvePhase({ taskId, phaseName: action.phaseName })
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
      <div className="flex flex-1 flex-col gap-4 p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Task not found</h1>
        <Link to="/">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  const task = taskQuery.data
  const workflow = getWorkflowDefinition(task.workflowType as WorkflowType)

  return (
    <div className="flex flex-1 flex-col gap-4 p-6 min-h-0">
      <div className="shrink-0 space-y-1">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <p className="text-sm text-muted-foreground">
          {task.repoName} · {workflow?.label ?? task.workflowType}
        </p>
      </div>

      {workflowMutation.isError && (
        <p className="text-sm text-destructive">
          {workflowMutation.error instanceof Error
            ? workflowMutation.error.message
            : 'Workflow action failed'}
        </p>
      )}

      <TaskWorkbench
        task={task}
        isRunning={workflowMutation.isPending}
        onRunPhase={(phaseName) => workflowMutation.mutate({ type: 'run', phaseName })}
        onApprovePhase={(phaseName) => workflowMutation.mutate({ type: 'approve', phaseName })}
        onRequestRevision={(phaseName, note) =>
          workflowMutation.mutate({ type: 'revise', phaseName, note })
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
