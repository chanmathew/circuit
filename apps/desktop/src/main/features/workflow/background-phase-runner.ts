import { broadcastTaskStreamUpdate } from '../../ipc/task-stream-broadcast.js'
import { autoRunOnTaskCreate } from './auto-run.js'
import { runChatMessage } from './run-chat-message.js'
import { runPhase } from './run-phase.js'

function notifyTaskUpdated(taskId: string): void {
  broadcastTaskStreamUpdate({ taskId, type: 'task_updated' })
}

/** Fire-and-forget phase run — status and stream updates come via broadcasts. */
export function schedulePhaseRun(taskId: string, phaseName?: string): void {
  void runPhase(taskId, phaseName)
    .then(() => notifyTaskUpdated(taskId))
    .catch((error) => {
      console.error(`[circuit] Phase run failed for task ${taskId}:`, error)
      notifyTaskUpdated(taskId)
    })
}

/** Fire-and-forget freeform chat turn. */
export function scheduleChatMessage(taskId: string, text: string): void {
  void runChatMessage(taskId, text)
    .then(() => notifyTaskUpdated(taskId))
    .catch((error) => {
      console.error(`[circuit] Chat run failed for task ${taskId}:`, error)
      notifyTaskUpdated(taskId)
    })
}

/** Background questions phase after task create (structured workflows only). */
export function scheduleAutoRunOnTaskCreate(taskId: string): void {
  void autoRunOnTaskCreate(taskId)
    .then((detail) => {
      if (detail) notifyTaskUpdated(taskId)
    })
    .catch((error) => {
      console.error(`[circuit] Auto-run failed for task ${taskId}:`, error)
      notifyTaskUpdated(taskId)
    })
}
