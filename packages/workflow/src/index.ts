export { autoSelectWorkflow, type WorkflowSelection } from './auto-select-workflow.js'
export {
  applyPhaseRevision,
  getDownstreamPhaseNames,
  getRevisitWarning,
  invalidateDownstreamPhases,
  isImplementationLocked,
  type DownstreamInvalidation,
  type RevisitWarning,
} from './phase-revisit.js'
export {
  canTransition,
  type PhaseMachine,
  type PhaseTransition,
  PHASE_TRANSITIONS,
} from './phase-machine.js'
export {
  getWorkflowDefinition,
  INVESTIGATION,
  QUICK_FIX,
  STRUCTURED_CHANGE,
  WORKFLOW_DEFINITIONS,
  type WorkflowDefinition,
} from './workflow-definitions.js'
export type {
  Artifact,
  ArtifactStatus,
  Phase,
  PhaseRun,
  PhaseRunStatus,
  PhaseStatus,
  RevisionKind,
  Task,
  TaskStatus,
  WorkflowType,
  WorkspaceStrategy,
} from './types.js'
