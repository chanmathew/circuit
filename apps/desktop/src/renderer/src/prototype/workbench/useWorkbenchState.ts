import { useCallback, useEffect, useState } from 'react'

import { createScenarioState, PHASE_ORDER } from './fixtures.js'
import { canApprovePhase } from './phase-approval.js'
import type {
  FindingStatus,
  MainMode,
  PrototypePhase,
  RevisionDraft,
  RightTab,
  ScenarioId,
  WorkbenchActions,
  WorkbenchState,
} from './types.js'

function nextPhaseName(current: string): string | undefined {
  const idx = PHASE_ORDER.indexOf(current as (typeof PHASE_ORDER)[number])
  if (idx === -1 || idx >= PHASE_ORDER.length - 1) return undefined
  return PHASE_ORDER[idx + 1]
}

function deriveNextAction(phases: PrototypePhase[], mainMode: MainMode): string {
  const needsReview = phases.find((p) => p.status === 'needs_review')
  if (needsReview) return `Approve ${needsReview.label.toLowerCase()}`
  const ready = phases.find((p) => p.status === 'ready')
  if (ready) return `Run ${ready.label.toLowerCase()}`
  const running = phases.find((p) => p.status === 'running')
  if (running) return `${running.label} in progress`
  if (mainMode === 'diff') return 'Review diff for current slice'
  if (mainMode === 'final_review') return 'Copy PR summary'
  return 'Workflow complete'
}

export function useWorkbenchState(scenario: ScenarioId): {
  state: WorkbenchState
  actions: WorkbenchActions
} {
  const [state, setState] = useState<WorkbenchState>(() => createScenarioState(scenario))

  useEffect(() => {
    setState(createScenarioState(scenario))
  }, [scenario])

  const selectArtifact = useCallback((id: string) => {
    setState((prev) => {
      const artifact = prev.artifacts.find((a) => a.id === id)
      if (!artifact) return prev
      return {
        ...prev,
        selectedArtifactId: id,
        mainMode:
          artifact.phase === 'review' && prev.mainMode === 'final_review'
            ? 'final_review'
            : prev.mainMode === 'diff' || prev.mainMode === 'implementation'
              ? prev.mainMode
              : 'artifact',
      }
    })
  }, [])

  const selectPhase = useCallback((name: string) => {
    setState((prev) => {
      const phase = prev.phases.find((p) => p.name === name)
      if (!phase || phase.status === 'locked') return prev
      const artifact = prev.artifacts.find((a) => a.phase === name)
      if (!artifact) return prev
      let mainMode: MainMode = 'artifact'
      if (name === 'implement' && prev.slices.length > 0) {
        mainMode = prev.mainMode === 'diff' ? 'diff' : 'implementation'
      }
      if (name === 'review') mainMode = 'final_review'
      return {
        ...prev,
        selectedArtifactId: artifact.id,
        mainMode,
      }
    })
  }, [])

  const setRightTab = useCallback((tab: RightTab) => {
    setState((prev) => ({ ...prev, rightTab: tab }))
  }, [])

  const setMainMode = useCallback((mode: MainMode) => {
    setState((prev) => ({ ...prev, mainMode: mode }))
  }, [])

  const approveCurrentPhase = useCallback(() => {
    setState((prev) => {
      if (!canApprovePhase(prev)) return prev

      const current = prev.phases.find((p) => p.status === 'needs_review')
      if (!current) return prev

      const next = nextPhaseName(current.name)
      const phases = prev.phases.map((p) => {
        if (p.name === current.name) return { ...p, status: 'approved' as const }
        if (next && p.name === next) return { ...p, status: 'ready' as const }
        return p
      })

      const artifacts = prev.artifacts.map((a) =>
        a.phase === current.name ? { ...a, status: 'approved' as const } : a,
      )

      let mainMode = prev.mainMode
      let slices = prev.slices
      if (current.name === 'plan' && slices.length === 0) {
        slices = createScenarioState('implementing').slices
        mainMode = 'implementation'
      }
      if (current.name === 'review') mainMode = 'final_review'

      const task = {
        ...prev.task,
        status: next === 'implement' ? 'implementing' : next ? 'needs_review' : 'done',
        nextAction: deriveNextAction(phases, mainMode),
      }

      return { ...prev, phases, artifacts, slices, mainMode, task }
    })
  }, [])

  const openRevision = useCallback(() => {
    setState((prev) => ({ ...prev, revisionOpen: true }))
  }, [])

  const closeRevision = useCallback(() => {
    setState((prev) => ({
      ...prev,
      revisionOpen: false,
      revisionDraft: { note: '' },
    }))
  }, [])

  const setRevisionNote = useCallback((note: string) => {
    setState((prev) => ({ ...prev, revisionDraft: { note } }))
  }, [])

  const submitRevision = useCallback(() => {
    setState((prev) => {
      const current = prev.phases.find((p) => p.status === 'needs_review')
      if (!current || !prev.revisionDraft.note.trim()) return prev

      const entry = {
        id: `rev-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        phase: current.name,
        note: prev.revisionDraft.note.trim(),
      }

      const phases = prev.phases.map((p) =>
        p.name === current.name ? { ...p, status: 'needs_revision' as const } : p,
      )

      return {
        ...prev,
        phases,
        revisionOpen: false,
        revisionDraft: { note: '' },
        revisionLog: [...prev.revisionLog, entry],
        activity: [
          ...prev.activity,
          {
            id: entry.id,
            timestamp: entry.timestamp,
            type: 'message' as const,
            content: `Revision requested: ${entry.note.slice(0, 80)}`,
          },
        ],
        task: { ...prev.task, nextAction: `Revise ${current.label.toLowerCase()}` },
      }
    })
  }, [])

  const requestRevision = openRevision

  const runCurrentPhase = useCallback(() => {
    setState((prev) => {
      const ready = prev.phases.find((p) => p.status === 'ready' || p.status === 'needs_revision')
      if (!ready) return prev

      const phases = prev.phases.map((p) =>
        p.name === ready.name ? { ...p, status: 'running' as const } : p,
      )

      return {
        ...prev,
        phases,
        isAgentRunning: true,
        activity: [
          ...prev.activity,
          {
            id: `run-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'message' as const,
            content: `Running ${ready.label} phase…`,
          },
        ],
        task: { ...prev.task, status: 'running', nextAction: `${ready.label} running…` },
      }
    })

    window.setTimeout(() => {
      setState((prev) => {
        const running = prev.phases.find((p) => p.status === 'running')
        if (!running) return prev

        const phases = prev.phases.map((p) =>
          p.name === running.name ? { ...p, status: 'needs_review' as const } : p,
        )
        const artifacts = prev.artifacts.map((a) =>
          a.phase === running.name && a.content.includes('_(empty)_')
            ? {
                ...a,
                content: `# ${running.label}\n\nGenerated content for ${running.label} phase.\n\n_(mock agent output)_`,
                status: 'needs_review' as const,
              }
            : a.phase === running.name
              ? { ...a, status: 'needs_review' as const }
              : a,
        )
        const artifact = artifacts.find((a) => a.phase === running.name)

        return {
          ...prev,
          phases,
          artifacts,
          isAgentRunning: false,
          selectedArtifactId: artifact?.id ?? prev.selectedArtifactId,
          mainMode: 'artifact',
          activity: [
            ...prev.activity,
            {
              id: `done-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: 'message' as const,
              content: `${running.label} complete — awaiting approval.`,
            },
          ],
          task: {
            ...prev.task,
            status: 'needs_review',
            nextAction: deriveNextAction(phases, 'artifact'),
          },
        }
      })
    }, 1200)
  }, [])

  const implementNextSlice = useCallback(() => {
    setState((prev) => {
      if (prev.slices.length === 0) return prev
      const idx = prev.slices.findIndex((s) => s.status === 'active')
      const activeIdx = idx >= 0 ? idx : prev.activeSliceIndex

      return {
        ...prev,
        isAgentRunning: true,
        mainMode: 'implementation',
        activity: [
          ...prev.activity,
          {
            id: `impl-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'message' as const,
            content: `Implementing ${prev.slices[activeIdx]?.title ?? 'slice'}…`,
          },
        ],
      }
    })

    window.setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isAgentRunning: false,
        mainMode: 'diff',
        rightTab: 'files',
        changedFiles:
          prev.changedFiles.length > 0
            ? prev.changedFiles
            : createScenarioState('implementing').changedFiles,
        validationOutput: '24 passed · 0 failed · 1.2s',
        activity: [
          ...prev.activity,
          {
            id: `impl-done-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'message' as const,
            content: 'Slice implementation complete — review diff.',
          },
        ],
        task: { ...prev.task, nextAction: 'Review diff for current slice' },
      }))
    }, 1500)
  }, [])

  const approveSlice = useCallback(() => {
    setState((prev) => {
      const idx = prev.slices.findIndex((s) => s.status === 'active')
      if (idx < 0) return { ...prev, mainMode: 'implementation' as const }

      const slices = prev.slices.map((s, i) => {
        if (i === idx) return { ...s, status: 'done' as const }
        if (i === idx + 1) return { ...s, status: 'active' as const }
        return s
      })

      const allDone = slices.every((s) => s.status === 'done')
      const nextIdx = idx + 1

      return {
        ...prev,
        slices,
        activeSliceIndex: allDone ? idx : nextIdx,
        mainMode: allDone ? 'artifact' : 'implementation',
        changedFiles: allDone ? prev.changedFiles : [],
        validationOutput: null,
        phases: allDone
          ? prev.phases.map((p) =>
              p.name === 'implement'
                ? { ...p, status: 'approved' as const }
                : p.name === 'review'
                  ? { ...p, status: 'ready' as const }
                  : p,
            )
          : prev.phases,
        task: {
          ...prev.task,
          nextAction: allDone ? 'Run review' : `Implement slice ${nextIdx + 1}`,
          status: allDone ? 'needs_review' : 'implementing',
        },
        activity: [
          ...prev.activity,
          {
            id: `slice-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'message' as const,
            content: allDone
              ? 'All slices approved — ready for final review.'
              : `Slice ${idx + 1} approved.`,
          },
        ],
      }
    })
  }, [])

  const requestSliceChanges = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mainMode: 'implementation',
      task: { ...prev.task, nextAction: 'Request changes on current slice' },
      activity: [
        ...prev.activity,
        {
          id: `changes-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'message' as const,
          content: 'Changes requested — revise implementation.',
        },
      ],
    }))
  }, [])

  const runValidation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      rightTab: 'git',
      validationOutput: 'Running validation…',
    }))
    window.setTimeout(() => {
      setState((prev) => ({
        ...prev,
        validationOutput: '847 passed · 0 failed · 12.4s',
        activity: [
          ...prev.activity,
          {
            id: `val-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'command' as const,
            content: 'pnpm test — 847 passed',
          },
        ],
      }))
    }, 800)
  }, [])

  const resetScenario = useCallback((s: ScenarioId) => {
    setState(createScenarioState(s))
  }, [])

  const answerHumanQa = useCallback((id: string, answer: string, usedCustom?: boolean) => {
    setState((prev) => {
      const patch = (i: import('./types.js').HumanQaItem) =>
        i.id === id
          ? {
              ...i,
              answer,
              status: i.status === 'deferred' ? i.status : ('pending' as const),
              usedCustomAnswer: usedCustom ?? false,
            }
          : i

      const structured = prev.structured
      if (structured.mode === 'human_qa') {
        return {
          ...prev,
          structured: {
            ...structured,
            items: structured.items.map(patch),
          },
        }
      }
      if (structured.mode === 'design_review') {
        const patchList = (items: import('./types.js').HumanQaItem[]) => items.map(patch)
        const inDecisions = structured.decisions.some((i) => i.id === id)
        return {
          ...prev,
          structured: {
            ...structured,
            decisions: inDecisions ? patchList(structured.decisions) : structured.decisions,
            openQuestions: inDecisions
              ? structured.openQuestions
              : patchList(structured.openQuestions),
          },
        }
      }
      return prev
    })
  }, [])

  const deferHumanQa = useCallback((id: string) => {
    setState((prev) => {
      const structured = prev.structured
      if (structured.mode === 'human_qa') {
        return {
          ...prev,
          structured: {
            ...structured,
            items: structured.items.map((i) =>
              i.id === id ? { ...i, status: 'deferred' as const } : i,
            ),
          },
        }
      }
      if (structured.mode === 'design_review') {
        const defer = (items: import('./types.js').HumanQaItem[]) =>
          items.map((i) => (i.id === id ? { ...i, status: 'deferred' as const } : i))
        const inDecisions = structured.decisions.some((i) => i.id === id)
        return {
          ...prev,
          structured: {
            ...structured,
            decisions: inDecisions ? defer(structured.decisions) : structured.decisions,
            openQuestions: inDecisions ? structured.openQuestions : defer(structured.openQuestions),
          },
        }
      }
      return prev
    })
  }, [])

  const verifyFinding = useCallback((id: string, status: FindingStatus) => {
    setState((prev) => {
      if (prev.structured.mode !== 'research_verify') return prev
      return {
        ...prev,
        structured: {
          ...prev.structured,
          findings: prev.structured.findings.map((f) => (f.id === id ? { ...f, status } : f)),
        },
      }
    })
  }, [])

  const approveStructureSlice = useCallback((id: string) => {
    setState((prev) => {
      if (prev.structured.mode !== 'structure_slices') return prev
      return {
        ...prev,
        structured: {
          ...prev.structured,
          slices: prev.structured.slices.map((s) =>
            s.id === id ? { ...s, status: 'approved' as const } : s,
          ),
        },
      }
    })
  }, [])

  const approvePlanSlice = useCallback((id: string) => {
    setState((prev) => {
      if (prev.structured.mode !== 'plan_slices') return prev
      return {
        ...prev,
        structured: {
          ...prev.structured,
          slices: prev.structured.slices.map((s) =>
            s.id === id ? { ...s, status: 'approved' as const } : s,
          ),
        },
      }
    })
  }, [])

  const toggleReviewChecklist = useCallback((id: string) => {
    setState((prev) => {
      if (prev.structured.mode !== 'review_checklist') return prev
      return {
        ...prev,
        structured: {
          ...prev.structured,
          items: prev.structured.items.map((i) =>
            i.id === id ? { ...i, checked: !i.checked } : i,
          ),
        },
      }
    })
  }, [])

  const setSliceFeedback = useCallback((text: string) => {
    setState((prev) => ({ ...prev, sliceFeedback: text }))
  }, [])

  const actions: WorkbenchActions = {
    selectArtifact,
    selectPhase,
    setRightTab,
    setMainMode,
    approveCurrentPhase,
    requestRevision,
    runCurrentPhase,
    implementNextSlice,
    approveSlice,
    requestSliceChanges,
    runValidation,
    resetScenario,
    openRevision,
    closeRevision,
    setRevisionNote,
    submitRevision,
    answerHumanQa,
    deferHumanQa,
    verifyFinding,
    approveStructureSlice,
    approvePlanSlice,
    toggleReviewChecklist,
    setSliceFeedback,
  }

  const stateWithAction = {
    ...state,
    task: { ...state.task, nextAction: deriveNextAction(state.phases, state.mainMode) },
  }

  return { state: stateWithAction, actions }
}
