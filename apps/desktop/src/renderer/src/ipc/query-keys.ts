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
  workspace: {
    paths: (workspacePath: string) => ['workspace', workspacePath, 'paths'] as const,
    file: (workspacePath: string, path: string) =>
      ['workspace', workspacePath, 'file', path] as const,
    gitStatus: (workspacePath: string) => ['workspace', workspacePath, 'git-status'] as const,
    gitDiff: (workspacePath: string, pathsKey: string, staged?: boolean, against?: 'HEAD' | 'index') =>
      ['workspace', workspacePath, 'git-diff', pathsKey, staged ?? false, against ?? 'index'] as const,
  },
} as const
