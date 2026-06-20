import { createHash } from 'node:crypto'

export interface ContextPackFile {
  path: string
  content: string
}

export interface ContextPack {
  files: ContextPackFile[]
  hash: string
}

export interface ContextPackArtifact {
  phase: string
  path: string
  title: string
  content: string
}

export interface BuildContextPackInput {
  ticketPath: string
  ticketContent: string
  approvedArtifacts: ContextPackArtifact[]
}

/** Bounded context from ticket + approved artifacts only (no transcripts). */
export function buildContextPack(input: BuildContextPackInput): ContextPack {
  const files: ContextPackFile[] = [
    { path: input.ticketPath, content: input.ticketContent },
    ...input.approvedArtifacts.map((artifact) => ({
      path: artifact.path,
      content: artifact.content,
    })),
  ]

  const canonical = JSON.stringify(
    files.map((file) => ({ path: file.path, content: file.content })),
  )
  const hash = createHash('sha256').update(canonical).digest('hex')

  return { files, hash }
}

export function serializeContextPackForPrompt(pack: ContextPack): string {
  if (pack.files.length === 0) return '_No context files._'

  return pack.files
    .map((file) => `## ${file.path}\n\n${file.content.trim()}`)
    .join('\n\n---\n\n')
}

export function buildPhasePrompt(phase: string, contextSection: string): string {
  return `# ${phase} phase\n\n## Context pack\n\n${contextSection}\n\nRun the ${phase} phase using the context above.`
}
