import { createRootRoute, createRoute } from '@tanstack/react-router'

import { AppShell } from './app/layout/AppShell.js'
import { DashboardPage } from './features/tasks/pages/DashboardPage.js'
import { ComposeTaskPage } from './features/tasks/pages/ComposeTaskPage.js'
import { NewTaskPage } from './features/tasks/pages/NewTaskPage.js'
import { TaskDetailPage } from './features/tasks/pages/TaskDetailPage.js'
import {
  WorkbenchPrototypePage,
  parseScenario,
  type WorkbenchPrototypeSearch,
} from './prototype/workbench/WorkbenchPrototypePage.js'

const rootRoute = createRootRoute({
  component: AppShell,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})

const composeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/compose',
  validateSearch: (search: Record<string, unknown>): { repoId?: string } => ({
    repoId: typeof search.repoId === 'string' ? search.repoId : undefined,
  }),
  component: function ComposeRoutePage() {
    const { repoId } = composeRoute.useSearch()
    return <ComposeTaskPage repoId={repoId ?? ''} />
  },
})

const newTaskRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/new-task',
  validateSearch: (search: Record<string, unknown>): { repoId?: string } => ({
    repoId: typeof search.repoId === 'string' ? search.repoId : undefined,
  }),
  component: function NewTaskRoutePage() {
    const { repoId } = newTaskRoute.useSearch()
    return <NewTaskPage repoIdFromSearch={repoId} />
  },
})

const taskDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tasks/$taskId',
  component: function TaskDetailRoutePage() {
    const { taskId } = taskDetailRoute.useParams()
    return <TaskDetailPage taskId={taskId} />
  },
})

const workbenchPrototypeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/prototype/workbench',
  validateSearch: (search: Record<string, unknown>): WorkbenchPrototypeSearch => ({
    scenario: parseScenario(search.scenario),
  }),
  component: function WorkbenchPrototypeRoutePage() {
    const { scenario } = workbenchPrototypeRoute.useSearch()
    return <WorkbenchPrototypePage scenario={scenario} />
  },
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  composeRoute,
  newTaskRoute,
  taskDetailRoute,
  workbenchPrototypeRoute,
])
