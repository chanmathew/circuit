import type {
  ApprovePhaseRequest,
  CreateTaskRequest,
  ListTasksRequest,
  RequestPhaseRevisionRequest,
  ResolveDecisionRequest,
  RunPhaseRequest,
} from '../../../shared/api.js'

/** Typed wrapper over the preload bridge — single entry point for renderer IPC. */
export const circuitApi = {
  ping: () => window.circuit.ping(),
  listRepos: () => window.circuit.listRepos(),
  addRepo: (path?: string) => window.circuit.addRepo(path),
  listTasks: (request?: ListTasksRequest) => window.circuit.listTasks(request),
  createTask: (request: CreateTaskRequest) => window.circuit.createTask(request),
  getTask: (taskId: string) => window.circuit.getTask(taskId),
  runPhase: (request: RunPhaseRequest) => window.circuit.runPhase(request),
  approvePhase: (request: ApprovePhaseRequest) => window.circuit.approvePhase(request),
  requestPhaseRevision: (request: RequestPhaseRevisionRequest) =>
    window.circuit.requestPhaseRevision(request),
  resolveDecision: (request: ResolveDecisionRequest) => window.circuit.resolveDecision(request),
} as const
