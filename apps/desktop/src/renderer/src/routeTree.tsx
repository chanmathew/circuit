import { createRootRoute, createRoute, Outlet } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
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
} from '@circuit/ui'
import { STRUCTURED_CHANGE } from '@circuit/workflow'

function AppShell(): React.ReactElement {
  const [pingResult, setPingResult] = useState<string>('…')

  useEffect(() => {
    window.circuit
      .ping()
      .then(setPingResult)
      .catch(() => setPingResult('error'))
  }, [])

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
          </nav>
        </ScrollArea>
        <div className="border-t border-border px-4 py-3">
          <Badge variant="secondary">IPC: {pingResult}</Badge>
        </div>
      </aside>
      <main className="flex flex-1 flex-col">
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

function DashboardPage(): React.ReactElement {
  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Task Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          No repos registered yet. Add a repo to start structured agent work.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
          <CardDescription>
            Circuit runs AI coding agents through reviewable development workflows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Structured Change workflow phases: {STRUCTURED_CHANGE.phases.join(' → ')}
          </p>
          <Separator />
          <Link to="/new-task">
            <Button>New task</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

function NewTaskPage(): React.ReactElement {
  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Task</h1>
        <p className="text-sm text-muted-foreground">Describe what the agent should work on.</p>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>What should the agent work on?</CardTitle>
          <CardDescription>
            Approach: Auto · Structured Change · Workspace: Isolated branch
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            className="flex min-h-[160px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Describe the task…"
            disabled
          />
          <div className="flex items-center gap-3">
            <Button disabled>Start task</Button>
            <span className="text-xs text-muted-foreground">
              Task creation coming in Milestone 1
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const routeTree = rootRoute.addChildren([indexRoute, newTaskRoute])
