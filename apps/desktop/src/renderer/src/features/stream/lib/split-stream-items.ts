import type { ActionCardItem, StreamItem } from '@circuit/protocol'

/** Harness permission/question cards — pinned above composer, not inline in chat. */
export function isHarnessPendingAction(item: StreamItem): item is ActionCardItem {
  return (
    item.kind === 'action_card' &&
    (item.id.startsWith('permission-') || item.id.startsWith('question-'))
  )
}

export function splitStreamItems(items: StreamItem[]): {
  chatItems: StreamItem[]
  pendingActions: ActionCardItem[]
} {
  const chatItems: StreamItem[] = []
  const pendingById = new Map<string, ActionCardItem>()

  for (const item of items) {
    if (isHarnessPendingAction(item)) {
      pendingById.set(item.id, item)
      continue
    }
    chatItems.push(item)
  }

  return { chatItems, pendingActions: [...pendingById.values()] }
}
