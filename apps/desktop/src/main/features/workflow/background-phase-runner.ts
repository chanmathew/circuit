import { broadcastTaskStreamUpdate } from '../../ipc/task-stream-broadcast.js'
import { isPhaseRunAborted } from './phase-run-errors.js'
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
      if (!isPhaseRunAborted(error)) {
        console.error(`[circuit] Phase run failed for task ${taskId}:`, error)
      }
      notifyTaskUpdated(taskId)
    })
}

/** Fire-and-forget freeform chat turn. */
export function scheduleChatMessage(taskId: string, text: string): void {
  void runChatMessage(taskId, text)
    .then(() => notifyTaskUpdated(taskId))
    .catch((error) => {
      if (!isPhaseRunAborted(error)) {
        console.error(`[circuit] Chat run failed for task ${taskId}:`, error)
      }
      notifyTaskUpdated(taskId)
    })
}
