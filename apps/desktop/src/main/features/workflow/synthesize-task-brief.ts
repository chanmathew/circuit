import { listWorkflowEventsForTask } from '@circuit/db'

import { getDb } from '../../db.js'

/** Build a task brief from steering events when converting chat → workflow. */
export function synthesizeTaskBrief(taskId: string, fallbackDescription: string): string {
  const events = listWorkflowEventsForTask(getDb(), taskId)
  const steeringTexts: string[] = []

  for (const event of events) {
    if (event.type !== 'workflow:steering_received') continue
    try {
      const payload = JSON.parse(event.payloadJson) as { rawText?: string }
      if (typeof payload.rawText === 'string' && payload.rawText.trim()) {
        steeringTexts.push(payload.rawText.trim())
      }
    } catch {
      if (event.summary?.trim()) steeringTexts.push(event.summary.trim())
    }
  }

  if (steeringTexts.length === 0) {
    return fallbackDescription.trim()
  }

  const unique = [...new Set(steeringTexts)]
  if (unique.length === 1) {
    return unique[0]!
  }

  return [
    '# Task brief (from chat)',
    '',
    '## Summary',
    unique[0]!,
    '',
    '## Conversation context',
    ...unique.slice(1).map((line) => `- ${line}`),
  ].join('\n')
}
