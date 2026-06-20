import type {
  AbortSessionRequest,
  ApprovePhaseRequest,
  CreateDraftTaskRequest,
  CreateTaskFromIntakeRequest,
  CreateTaskRequest,
  ListTasksRequest,
  ReplyPermissionRequest,
  ReplyQuestionRequest,
  RejectQuestionRequest,
  RequestPhaseRevisionRequest,
  ResolveDecisionRequest,
  RunPhaseRequest,
  RecordSteeringRequest,
  SendChatMessageRequest,
  ApplySteeringRevisionRequest,
  SubmitTaskIntakeRequest,
  TaskStreamUpdate,
} from '../../../shared/api.js'

/** Typed wrapper over the preload bridge — single entry point for renderer IPC. */
export const circuitApi = {
  ping: () => window.circuit.ping(),
  getAppConfig: () => window.circuit.getAppConfig(),
  listRepos: () => window.circuit.listRepos(),
  addRepo: (path?: string) => window.circuit.addRepo(path),
  listTasks: (request?: ListTasksRequest) => window.circuit.listTasks(request),
  createTask: (request: CreateTaskRequest) => window.circuit.createTask(request),
  createDraftTask: (request: CreateDraftTaskRequest) => window.circuit.createDraftTask(request),
  createTaskFromIntake: async (request: CreateTaskFromIntakeRequest) => {
    if (typeof window.circuit.createTaskFromIntake === 'function') {
      return window.circuit.createTaskFromIntake(request)
    }
    const draft = await window.circuit.createDraftTask({ repoId: request.repoId })
    return window.circuit.submitTaskIntake({
      taskId: draft.id,
      text: request.text,
      mode: request.mode ?? 'chat',
    })
  },
  submitTaskIntake: (request: SubmitTaskIntakeRequest) => window.circuit.submitTaskIntake(request),
  sendChatMessage: (request: SendChatMessageRequest) => window.circuit.sendChatMessage(request),
  getTask: (taskId: string) => window.circuit.getTask(taskId),
  runPhase: (request: RunPhaseRequest) => window.circuit.runPhase(request),
  approvePhase: (request: ApprovePhaseRequest) => window.circuit.approvePhase(request),
  requestPhaseRevision: (request: RequestPhaseRevisionRequest) =>
    window.circuit.requestPhaseRevision(request),
  resolveDecision: (request: ResolveDecisionRequest) => window.circuit.resolveDecision(request),
  recordSteering: (request: RecordSteeringRequest) => window.circuit.recordSteering(request),
  applySteeringRevision: (request: ApplySteeringRevisionRequest) =>
    window.circuit.applySteeringRevision(request),
  replyPermission: (request: ReplyPermissionRequest) => window.circuit.replyPermission(request),
  replyQuestion: (request: ReplyQuestionRequest) => window.circuit.replyQuestion(request),
  rejectQuestion: (request: RejectQuestionRequest) => window.circuit.rejectQuestion(request),
  abortSession: (request: AbortSessionRequest) => window.circuit.abortSession(request),
  onTaskStreamUpdate: (callback: (update: TaskStreamUpdate) => void) =>
    window.circuit.onTaskStreamUpdate(callback),
} as const
