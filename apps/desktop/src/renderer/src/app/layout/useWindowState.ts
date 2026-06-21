import { useEffect, useState } from 'react'

import type { WindowState } from '../../../../shared/api.js'
import { circuitApi } from '../../ipc/client.js'

export function useWindowState(): WindowState | null {
  const [state, setState] = useState<WindowState | null>(null)

  useEffect(() => {
    void circuitApi.getWindowState().then(setState)
  }, [])

  return state
}
