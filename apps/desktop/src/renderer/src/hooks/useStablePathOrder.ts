import { useEffect, useMemo, useRef } from 'react'

import { mergeStablePathOrder } from '../lib/stable-path-order.js'

/** Keep path order stable across refreshes; reset when `resetKey` changes. */
export function useStablePathOrder(
  currentPaths: readonly string[],
  resetKey: string,
): string[] {
  const orderRef = useRef<string[]>([])

  useEffect(() => {
    orderRef.current = []
  }, [resetKey])

  return useMemo(() => {
    orderRef.current = mergeStablePathOrder(orderRef.current, currentPaths)
    return orderRef.current
  }, [currentPaths])
}
