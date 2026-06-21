import { useQuery } from '@tanstack/react-query'

import { circuitApi } from '../../../ipc/client.js'
import { queryKeys } from '../../../ipc/query-keys.js'

export function useAppConfig() {
  return useQuery({
    queryKey: queryKeys.app.config,
    queryFn: () => circuitApi.getAppConfig(),
    staleTime: Infinity,
  })
}
