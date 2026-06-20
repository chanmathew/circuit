import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { Button, cn, ScrollArea } from '@circuit/ui'

import {
  ACTIVE_PROTOTYPE_TASK_ID,
  PROTOTYPE_PROJECTS,
  type PrototypeProject,
} from './project-tree-fixtures.js'

function ChevronIcon({ open }: { open: boolean }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn(
        'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
        open && 'rotate-90',
      )}
      fill="currentColor"
      aria-hidden
    >
      <path d="M6 4l4 4-4 4V4z" />
    </svg>
  )
}

function PlusIcon(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M8 3v10M3 8h10" strokeLinecap="round" />
    </svg>
  )
}

interface ProjectTreeSidebarProps {
  selectedTaskId?: string
  onSelectTask?: (taskId: string) => void
  onNewTask?: (projectId: string) => void
  onAddProject?: () => void
}

export function ProjectTreeSidebar({
  selectedTaskId = ACTIVE_PROTOTYPE_TASK_ID,
  onSelectTask,
  onNewTask,
  onAddProject,
}: ProjectTreeSidebarProps): React.ReactElement {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PROTOTYPE_PROJECTS.map((p) => [p.id, p.defaultExpanded ?? true])),
  )

  const toggleProject = (projectId: string) => {
    setExpanded((prev) => ({ ...prev, [projectId]: !prev[projectId] }))
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-3">
        <div>
          <p className="text-sm font-semibold tracking-tight">Circuit</p>
          <p className="text-[10px] text-muted-foreground">Projects</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title="Add repo"
          onClick={onAddProject}
        >
          <PlusIcon />
        </Button>
      </div>

      <ScrollArea className="flex-1 py-2">
        <div className="space-y-1 px-2">
          {PROTOTYPE_PROJECTS.map((project) => (
            <ProjectSection
              key={project.id}
              project={project}
              open={expanded[project.id] ?? true}
              selectedTaskId={selectedTaskId}
              onToggle={() => toggleProject(project.id)}
              onSelectTask={onSelectTask}
              onNewTask={onNewTask}
            />
          ))}
        </div>
      </ScrollArea>

      {import.meta.env.DEV && (
        <div className="shrink-0 space-y-2 border-t border-border px-3 py-2">
          <Link
            to="/"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            ← Back to app
          </Link>
        </div>
      )}
    </aside>
  )
}

function ProjectSection({
  project,
  open,
  selectedTaskId,
  onToggle,
  onSelectTask,
  onNewTask,
}: {
  project: PrototypeProject
  open: boolean
  selectedTaskId: string
  onToggle: () => void
  onSelectTask?: (taskId: string) => void
  onNewTask?: (projectId: string) => void
}): React.ReactElement {
  return (
    <div className="rounded-md">
      <div className="group flex items-center gap-0.5 rounded-md hover:bg-accent/50">
        <button
          type="button"
          onClick={onToggle}
          className="flex h-8 w-7 shrink-0 items-center justify-center rounded-md"
          aria-label={open ? 'Collapse project' : 'Expand project'}
        >
          <ChevronIcon open={open} />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 truncate py-2 pr-1 text-left text-xs font-medium"
          title={project.path}
        >
          {project.name}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onNewTask?.(project.id)
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
          title="New task"
        >
          <PlusIcon />
        </button>
      </div>

      {open && (
        <div className="ml-3 border-l border-border pl-2 pb-1">
          {project.tasks.map((task) => {
            const selected = task.id === selectedTaskId
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelectTask?.(task.id)}
                className={cn(
                  'flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors',
                  selected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/40',
                )}
              >
                <span className="truncate text-xs font-medium">{task.title}</span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {task.currentPhase} · {task.status}
                </span>
              </button>
            )
          })}
          {project.tasks.length === 0 && (
            <p className="px-2 py-1 text-[10px] text-muted-foreground">No tasks</p>
          )}
        </div>
      )}
    </div>
  )
}
