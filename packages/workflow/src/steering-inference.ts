import type { RevisionInferencePayload } from '@circuit/protocol'

import { getDownstreamPhaseNames } from './phase-revisit.js'
import { getWorkflowDefinition } from './workflow-definitions.js'
import type { PhaseStatus, WorkflowType } from './types.js'

const STEERING_SIGNAL = /\b(actually|instead|rather|change|switch|use|prefer|revise)\b/i

const PHASE_KEYWORDS: Record<string, RegExp[]> = {
  design: [/\bfolder/i, /\blabel/i, /\brouting/i, /\bdesign/i, /\barchitecture/i],
  structure: [/\bstructure/i, /\bmodule/i, /\blayout/i],
  plan: [/\bplan\b/i, /\bslice/i, /\bimplement(ation)? order/i],
}

const PROGRESS_STATUSES = new Set<PhaseStatus>([
  'approved',
  'needs_review',
  'needs_revision',
  'stale',
  'running',
])

export interface SteeringInferenceInput {
  text: string
  workflowType: WorkflowType
  phases: Array<{ name: string; status: PhaseStatus }>
}

function capitalizePhase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/** Deterministic steering → revision inference (no LLM). */
export function inferRevisionFromSteering(
  input: SteeringInferenceInput,
): RevisionInferencePayload | null {
  const trimmed = input.text.trim()
  if (!trimmed || !STEERING_SIGNAL.test(trimmed)) return null

  const definition = getWorkflowDefinition(input.workflowType)
  if (!definition) return null

  let affectedPhase: string | null = null

  for (const phaseName of definition.phases) {
    const phase = input.phases.find((entry) => entry.name === phaseName)
    if (!phase || !PROGRESS_STATUSES.has(phase.status)) continue

    const keywords = PHASE_KEYWORDS[phaseName] ?? []
    if (keywords.some((pattern) => pattern.test(trimmed))) {
      affectedPhase = phaseName
      break
    }
  }

  if (!affectedPhase && /\b(folder|label|routing)\b/i.test(trimmed)) {
    const design = input.phases.find((entry) => entry.name === 'design')
    if (design && PROGRESS_STATUSES.has(design.status)) {
      affectedPhase = 'design'
    }
  }

  if (!affectedPhase) return null

  const downstream = getDownstreamPhaseNames(input.workflowType, affectedPhase)
  const stalePhases = downstream.filter((name: string) => {
    const phase = input.phases.find((entry) => entry.name === name)
    return phase !== undefined && PROGRESS_STATUSES.has(phase.status)
  })

  const affected = input.phases.find((entry) => entry.name === affectedPhase)
  if (stalePhases.length === 0 && affected?.status !== 'approved') {
    return null
  }

  const phaseLabel = capitalizePhase(affectedPhase)
  const staleLabel = stalePhases.map(capitalizePhase).join(' and ')

  return {
    source: 'chat',
    affectedPhase,
    message:
      stalePhases.length > 0
        ? `This changes ${phaseLabel}. Mark ${staleLabel} stale?`
        : `Revise ${phaseLabel} based on your steering?`,
    stalePhases,
    options: [
      { id: 'revise', label: `Revise ${phaseLabel}`, recommended: true },
      { id: 'note', label: 'Add note only' },
      { id: 'cancel', label: 'Cancel' },
    ],
  }
}
