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
  },
} as const
