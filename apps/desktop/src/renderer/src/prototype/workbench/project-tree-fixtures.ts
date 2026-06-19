export interface PrototypeProjectTask {
  id: string
  title: string
  status: string
  currentPhase: string
}

export interface PrototypeProject {
  id: string
  name: string
  path: string
  tasks: PrototypeProjectTask[]
  defaultExpanded?: boolean
}

export const PROTOTYPE_PROJECTS: PrototypeProject[] = [
  {
    id: 'proj-a',
    name: 'chorus-client-runtime',
    path: '~/Dev/chorus-client-runtime',
    defaultExpanded: true,
    tasks: [
      {
        id: 'task-invoice',
        title: 'Invoice inbox triage',
        status: 'needs_review',
        currentPhase: 'questions',
      },
      {
        id: 'task-webhook',
        title: 'Fix webhook retry',
        status: 'draft',
        currentPhase: 'plan',
      },
    ],
  },
  {
    id: 'proj-b',
    name: 'circuit',
    path: '~/Dev/circuit',
    defaultExpanded: true,
    tasks: [
      {
        id: 'task-workbench',
        title: 'Task workbench UX',
        status: 'running',
        currentPhase: 'design',
      },
    ],
  },
  {
    id: 'proj-c',
    name: 'payments-api',
    path: '~/Dev/payments-api',
    defaultExpanded: false,
    tasks: [
      {
        id: 'task-idempotency',
        title: 'Idempotency keys',
        status: 'done',
        currentPhase: 'review',
      },
    ],
  },
]

/** Task id used by the active workbench scenario (invoice inbox triage). */
export const ACTIVE_PROTOTYPE_TASK_ID = 'task-invoice'
