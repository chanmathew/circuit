import { useContext, useEffect, useState } from 'react'

import type { StreamActivityEvent } from '@circuit/protocol'

import { circuitApi } from '../../../ipc/client.js'
import {
  TaskStreamContext,
  type HarnessSessionState,
  type TaskStreamLiveState,
} from '../providers/TaskStreamProvider.js'
import { dedupeHarnessActivities } from './task-stream-live-state.js'

export type { HarnessSessionState, TaskStreamLiveState }
export { TaskStreamProvider, useTaskStreamContext } from '../providers/TaskStreamProvider.js'

/** Uses TaskStreamProvider when present; otherwise attaches its own IPC listener. */
export function useTaskStreamLive(taskId: string): TaskStreamLiveState {
  const context = useContext(TaskStreamContext)
  if (context) return context

  const [liveActivities, setLiveActivities] = useState<StreamActivityEvent[]>([])
  const [phaseRunning, setPhaseRunning] = useState(false)
  const [harnessSession, setHarnessSession] = useState<HarnessSessionState | null>(null)
  const [lastPhaseRunError, setLastPhaseRunError] = useState<string | null>(null)

  useEffect(() => {
    setLiveActivities([])
    setPhaseRunning(false)
    setHarnessSession(null)
    setLastPhaseRunError(null)
  }, [taskId])

  useEffect(() => {
    return circuitApi.onTaskStreamUpdate((update) => {
      if (update.taskId !== taskId) return

      if (update.type === 'activity') {
        setLiveActivities((current) => dedupeHarnessActivities([...current, update.activity]))
        return
      }

      if (update.type === 'phase_run_started') {
        setLiveActivities([])
        setPhaseRunning(true)
        setLastPhaseRunError(null)
        return
      }

      if (update.type === 'phase_run_completed') {
        setPhaseRunning(false)
        setHarnessSession(null)
        setLastPhaseRunError(null)
        return
      }

      if (update.type === 'phase_run_failed') {
        setPhaseRunning(false)
        setHarnessSession(null)
        setLastPhaseRunError(update.error === 'Session aborted by user' ? null : update.error)
        return
      }

      if (update.type === 'harness_session_active') {
        setHarnessSession({
          sessionId: update.sessionId,
          workspacePath: update.workspacePath,
        })
        return
      }

      if (update.type === 'harness_session_cleared') {
        setHarnessSession(null)
      }
    })
  }, [taskId])

  return { liveActivities, phaseRunning, harnessSession, lastPhaseRunError }
}
