import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type { StreamActivityEvent } from '@circuit/protocol'

import { circuitApi } from '../../../ipc/client.js'
import { queryKeys } from '../../../ipc/query-keys.js'
import { dedupeHarnessActivities } from '../hooks/task-stream-live-state.js'

export interface HarnessSessionState {
  sessionId: string
  workspacePath: string
}

export interface TaskStreamLiveState {
  liveActivities: StreamActivityEvent[]
  phaseRunning: boolean
  harnessSession: HarnessSessionState | null
  lastPhaseRunError: string | null
}

const TaskStreamContext = createContext<TaskStreamLiveState | null>(null)

export { TaskStreamContext }

export function TaskStreamProvider({
  taskId,
  children,
}: {
  taskId: string
  children: ReactNode
}): React.ReactElement {
  const queryClient = useQueryClient()
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
        void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
        void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
        return
      }

      if (update.type === 'phase_run_completed') {
        setPhaseRunning(false)
        setHarnessSession(null)
        setLastPhaseRunError(null)
        void (async () => {
          await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId) })
          await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
          setLiveActivities([])
        })()
        void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
        return
      }

      if (update.type === 'phase_run_failed') {
        setPhaseRunning(false)
        setHarnessSession(null)
        setLastPhaseRunError(
          update.error === 'Session aborted by user' ? null : update.error,
        )
        void (async () => {
          await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId) })
          await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
          setLiveActivities([])
        })()
        void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
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
        return
      }

      if (update.type === 'task_updated') {
        void (async () => {
          await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId) })
          await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
        })()
        void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      }
    })
  }, [queryClient, taskId])

  const value = useMemo(
    () => ({ liveActivities, phaseRunning, harnessSession, lastPhaseRunError }),
    [liveActivities, phaseRunning, harnessSession, lastPhaseRunError],
  )

  return <TaskStreamContext.Provider value={value}>{children}</TaskStreamContext.Provider>
}

export function useTaskStreamContext(): TaskStreamLiveState {
  const context = useContext(TaskStreamContext)
  if (!context) {
    throw new Error('useTaskStreamContext must be used within TaskStreamProvider')
  }
  return context
}
