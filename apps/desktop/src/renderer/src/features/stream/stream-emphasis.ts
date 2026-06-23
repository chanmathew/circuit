import type { StreamItem } from '@circuit/protocol'

/** Stream items that should use full foreground contrast (latest exchange + live). */
export function computeBrightStreamItemIds(items: StreamItem[]): Set<string> {
  const bright = new Set<string>()

  let foundAgent = false
  let foundUser = false
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]
    if (!foundAgent && item.kind === 'agent_message') {
      bright.add(item.id)
      foundAgent = true
    }
    if (!foundUser && item.kind === 'user_message') {
      bright.add(item.id)
      foundUser = true
    }
    if (foundAgent && foundUser) break
  }

  for (const item of items) {
    if (item.kind === 'activity_group' && item.live) bright.add(item.id)
    if (item.kind === 'subagent_run' && item.live) bright.add(item.id)
    if (item.kind === 'reasoning' && item.isStreaming) bright.add(item.id)
    if (item.kind === 'agent_message' && item.isStreaming) bright.add(item.id)
  }

  return bright
}
