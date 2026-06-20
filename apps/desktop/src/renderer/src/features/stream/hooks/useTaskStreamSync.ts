import { useTaskStreamContext } from './TaskStreamProvider.js'

/** @deprecated Query invalidation is handled by TaskStreamProvider. */
export function useTaskStreamSync(_taskId: string): void {
  useTaskStreamContext()
}
