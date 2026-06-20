import { useQuery } from '@tanstack/react-query'

import { circuitApi } from '../../../ipc/client.js'
import { queryKeys } from '../../../ipc/query-keys.js'

export function useTasks() {
  return useQuery({
    queryKey: queryKeys.tasks.all,
    queryFn: () => circuitApi.listTasks(),
  })
}
