import { autoSelectWorkflow, type WorkflowSelection } from './auto-select-workflow.js'
import { getWorkflowDefinition } from './workflow-definitions.js'
import type { WorkflowType, WorkspaceStrategy } from './types.js'

/** Composer task mode — workflow intent, not interaction mode (ADR 005). */
export type TaskMode = 'auto' | 'quick_fix' | 'structured_change' | 'investigation'

export const DEFAULT_TASK_MODE: TaskMode = 'auto'

export interface TaskModeOption {
  value: TaskMode
  label: string
}

export const TASK_MODE_OPTIONS: TaskModeOption[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'quick_fix', label: 'Quick Fix' },
  { value: 'structured_change', label: 'Guided Build' },
  { value: 'investigation', label: 'Investigate' },
]

const STRUCTURED_WORKFLOW_TYPES = new Set<WorkflowType>([
  'quick_fix',
  'structured_change',
  'investigation',
])

export function getTaskModeLabel(mode: TaskMode): string {
  return TASK_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? mode
}

export function workflowTypeToTaskMode(workflowType: WorkflowType): TaskMode | undefined {
  if (workflowType === 'freeform' || workflowType === 'pr_review') return undefined
  if (STRUCTURED_WORKFLOW_TYPES.has(workflowType)) {
    return workflowType as TaskMode
  }
  return undefined
}

function isWorkflowAttached(workflowStatus: string): boolean {
  return workflowStatus === 'active' || workflowStatus === 'paused'
}

export function isValidTaskMode(value: string): value is TaskMode {
  return TASK_MODE_OPTIONS.some((option) => option.value === value)
}

export function isTaskModeEditable(workflowStatus: string): boolean {
  return !isWorkflowAttached(workflowStatus)
}

export function getEffectiveTaskMode(input: {
  taskMode: string
  workflowStatus: string
  workflowType: string
  activeWorkflowType?: string
}): TaskMode {
  if (isWorkflowAttached(input.workflowStatus)) {
    const attachedType = (input.activeWorkflowType ?? input.workflowType) as WorkflowType
    return workflowTypeToTaskMode(attachedType) ?? DEFAULT_TASK_MODE
  }

  const stored = input.taskMode as TaskMode
  return TASK_MODE_OPTIONS.some((option) => option.value === stored) ? stored : DEFAULT_TASK_MODE
}

export interface WorkflowPreview {
  workflowType: WorkflowType
  label: string
  inferred: boolean
  phases: string[]
}

export function resolvePreviewWorkflowType(
  taskMode: TaskMode,
  description: string,
): WorkflowPreview | undefined {
  const workflowType = resolveWorkflowTypeFromTaskMode(taskMode, description)
  const definition = getWorkflowDefinition(workflowType)
  if (!definition) return undefined

  return {
    workflowType,
    label: definition.label,
    inferred: taskMode === 'auto',
    phases: definition.phases,
  }
}

export function resolveWorkflowTypeFromTaskMode(
  taskMode: TaskMode,
  description: string,
): WorkflowType {
  if (taskMode === 'auto') {
    return autoSelectWorkflow(description).workflowType
  }
  return taskMode
}

export function resolveWorkflowSelectionFromTask(input: {
  taskMode: TaskMode
  description: string
  workspaceStrategy?: WorkspaceStrategy
}): WorkflowSelection {
  const workflowType = resolveWorkflowTypeFromTaskMode(input.taskMode, input.description)
  const auto = autoSelectWorkflow(input.description)
  return {
    workflowType,
    workspaceStrategy: input.workspaceStrategy ?? auto.workspaceStrategy,
    confidence: input.taskMode === 'auto' ? auto.confidence : 1,
    reason: input.taskMode === 'auto' ? auto.reason : `Task mode: ${input.taskMode}`,
  }
}
