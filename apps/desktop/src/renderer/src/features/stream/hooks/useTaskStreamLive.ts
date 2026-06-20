import { useEffect, useState } from 'react'

import type { StreamActivityEvent } from '@circuit/protocol'

import { circuitApi } from '../../../ipc/client.js'

export function useTaskStreamLive(taskId: string): StreamActivityEvent[] {
  const [liveActivities, setLiveActivities] = useState<StreamActivityEvent[]>([])

  useEffect(() => {
    setLiveActivities([])
  }, [taskId])

  useEffect(() => {
    return circuitApi.onTaskStreamUpdate((update) => {
      if (update.taskId !== taskId) return

      if (update.type === 'activity') {
        setLiveActivities((current) => [...current, update.activity])
        return
      }

      if (update.type === 'phase_run_started') {
        setLiveActivities([])
        return
      }

      if (update.type === 'phase_run_completed' || update.type === 'phase_run_failed') {
        setLiveActivities([])
      }
    })
  }, [taskId])

  return liveActivities
}
