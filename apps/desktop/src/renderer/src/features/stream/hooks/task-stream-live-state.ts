import type { StreamActivityEvent } from '@circuit/protocol'

export function dedupeHarnessActivities(activities: StreamActivityEvent[]): StreamActivityEvent[] {
  const harnessPending = new Map<string, StreamActivityEvent>()
  const messageById = new Map<string, StreamActivityEvent>()
  const rest: StreamActivityEvent[] = []

  for (const activity of activities) {
    if (activity.type === 'question_request') {
      const requestId =
        typeof activity.metadata?.requestId === 'string'
          ? activity.metadata.requestId
          : activity.timestamp
      harnessPending.set(`question:${requestId}`, activity)
      continue
    }
    if (activity.type === 'permission_request') {
      const permissionId =
        typeof activity.metadata?.permissionId === 'string'
          ? activity.metadata.permissionId
          : activity.timestamp
      harnessPending.set(`permission:${permissionId}`, activity)
      continue
    }
    if (activity.type === 'message') {
      const messageId =
        typeof activity.metadata?.messageID === 'string'
          ? activity.metadata.messageID
          : `${activity.timestamp}:${activity.content}`
      messageById.set(messageId, activity)
      continue
    }
    rest.push(activity)
  }

  return [...rest, ...messageById.values(), ...harnessPending.values()]
}
