import type { CircuitBlockPayloadMap, CircuitBlockType } from './blocks.js'
import type { DecisionOption, DecisionRequiredPayload } from './decisions.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function parseDecisionOption(raw: unknown): DecisionOption | undefined {
  if (!isRecord(raw) || !isNonEmptyString(raw.id) || !isNonEmptyString(raw.label)) {
    return undefined
  }

  return {
    id: raw.id,
    label: raw.label,
    recommended: typeof raw.recommended === 'boolean' ? raw.recommended : undefined,
  }
}

export function parseDecisionPayload(raw: unknown): DecisionRequiredPayload | undefined {
  if (!isRecord(raw)) return undefined
  if (!isNonEmptyString(raw.decisionId) || !isNonEmptyString(raw.title)) return undefined
  if (!Array.isArray(raw.options) || raw.options.length === 0) return undefined

  const options = raw.options
    .map(parseDecisionOption)
    .filter((option): option is DecisionOption => option !== undefined)

  if (options.length === 0) return undefined

  return {
    decisionId: raw.decisionId,
    title: raw.title,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    options,
    phase: typeof raw.phase === 'string' ? raw.phase : undefined,
    artifactId: typeof raw.artifactId === 'string' ? raw.artifactId : undefined,
    allowCustomAnswer:
      typeof raw.allowCustomAnswer === 'boolean' ? raw.allowCustomAnswer : undefined,
  }
}

export function parseArtifactPayload(
  raw: unknown,
): CircuitBlockPayloadMap['circuit-artifact'] | undefined {
  if (!isRecord(raw)) return undefined
  if (!isNonEmptyString(raw.phase) || !isNonEmptyString(raw.path) || !isNonEmptyString(raw.title)) {
    return undefined
  }

  const status = raw.status
  if (status !== undefined && status !== 'draft' && status !== 'needs_review') {
    return undefined
  }

  return {
    phase: raw.phase,
    path: raw.path,
    title: raw.title,
    status,
  }
}

export function parseValidationPayload(
  raw: unknown,
): CircuitBlockPayloadMap['circuit-validation'] | undefined {
  if (!isRecord(raw)) return undefined
  if (!isNonEmptyString(raw.command)) return undefined
  if (typeof raw.exitCode !== 'number') return undefined
  if (typeof raw.passed !== 'boolean') return undefined

  return {
    command: raw.command,
    exitCode: raw.exitCode,
    passed: raw.passed,
    output: typeof raw.output === 'string' ? raw.output : undefined,
  }
}

export function parseBlockerPayload(
  raw: unknown,
): CircuitBlockPayloadMap['circuit-blocker'] | undefined {
  if (!isRecord(raw)) return undefined
  if (!isNonEmptyString(raw.blockerId) || !isNonEmptyString(raw.title)) return undefined

  return {
    blockerId: raw.blockerId,
    title: raw.title,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    phase: typeof raw.phase === 'string' ? raw.phase : undefined,
    sliceId: typeof raw.sliceId === 'string' ? raw.sliceId : undefined,
  }
}

export function parseDiffPayload(raw: unknown): CircuitBlockPayloadMap['circuit-diff'] | undefined {
  if (!isRecord(raw)) return undefined
  if (!Array.isArray(raw.paths) || raw.paths.some((path) => typeof path !== 'string')) {
    return undefined
  }

  return {
    sliceId: typeof raw.sliceId === 'string' ? raw.sliceId : undefined,
    paths: raw.paths,
    summary: typeof raw.summary === 'string' ? raw.summary : undefined,
  }
}

const BLOCK_VALIDATORS: {
  [K in CircuitBlockType]: (raw: unknown) => CircuitBlockPayloadMap[K] | undefined
} = {
  'circuit-decision': parseDecisionPayload,
  'circuit-artifact': parseArtifactPayload,
  'circuit-validation': parseValidationPayload,
  'circuit-blocker': parseBlockerPayload,
  'circuit-diff': parseDiffPayload,
}

export function validateBlockPayload<T extends CircuitBlockType>(
  type: T,
  raw: unknown,
): CircuitBlockPayloadMap[T] | undefined {
  return BLOCK_VALIDATORS[type](raw)
}
