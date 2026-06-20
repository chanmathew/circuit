import { useNavigate } from '@tanstack/react-router'
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

import { useRepos } from '../../repos/hooks/useRepos.js'
import { useCreateTask } from '../hooks/useCreateTask.js'

export interface NewTaskPageSearch {
  repoId?: string
}

export function NewTaskPage({ repoIdFromSearch }: { repoIdFromSearch?: string }): React.ReactElement {
  const navigate = useNavigate()
  const reposQuery = useRepos()
  const createTaskMutation = useCreateTask()
  const [description, setDescription] = useState('')
  const [repoId, setRepoId] = useState('')

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
                onClick={() =>
                  createTaskMutation.mutate(
                    { repoId, description: description.trim() },
                    {
                      onSuccess: (task) => {
                        void navigate({ to: '/tasks/$taskId', params: { taskId: task.id } })
                      },
                    },
                  )
                }
                disabled={!description.trim() || !repoId || createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? 'Creating…' : 'Start task'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
