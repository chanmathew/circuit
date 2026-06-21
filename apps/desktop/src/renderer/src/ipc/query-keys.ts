/** TanStack Query key factory for Circuit IPC data. */
export const queryKeys = {
  app: {
    config: ['app', 'config'] as const,
  },
  repos: {
    all: ['repos'] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    detail: (taskId: string) => ['tasks', taskId] as const,
    chatDelta: (taskId: string) => ['tasks', taskId, 'chat-delta'] as const,
    workflowRun: (taskId: string, runId: string) => ['tasks', taskId, 'workflow-run', runId] as const,
  },
  artifacts: {
    detail: (artifactId: string) => ['artifacts', artifactId] as const,
  },
} as const
