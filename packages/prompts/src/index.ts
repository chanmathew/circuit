export const PROMPT_WORKFLOWS = ['structured-change', 'quick-fix', 'investigation'] as const

export type PromptWorkflow = (typeof PROMPT_WORKFLOWS)[number]

export function getPromptPath(workflow: PromptWorkflow, filename: string): string {
  return `${workflow}/${filename}`
}
