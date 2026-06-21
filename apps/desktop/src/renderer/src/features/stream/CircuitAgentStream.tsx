import { Shimmer } from '@circuit/ui'
import { useCallback, useMemo, useState } from 'react'

import type { WorkflowType } from '@circuit/workflow'
import type { ReferenceTarget, StreamAction } from '@circuit/protocol'
import type { DecisionResolutionDto, FeedEventDto, PermissionReply, PhaseDto, ArtifactDto } from '../../../../shared/api.js'
import { useSubmitTaskIntake } from '../tasks/hooks/useSubmitTaskIntake.js'
import { useApplySteeringRevision } from './hooks/useApplySteeringRevision.js'
import { useAbortSession } from './hooks/useAbortSession.js'
import { useStartFollowUpWorkflow } from './hooks/useStartFollowUpWorkflow.js'
import { useReplyPermission } from './hooks/useReplyPermission.js'
import { useReplyQuestion } from './hooks/useReplyQuestion.js'
import { useRejectQuestion } from './hooks/useRejectQuestion.js'
import { useSendChatMessage } from './hooks/useSendChatMessage.js'
import { useTaskStreamItems, type LocalUserMessage } from './hooks/useTaskStreamItems.js'
import { useTaskStreamLive } from './hooks/useTaskStreamLive.js'
import { splitStreamItems } from './lib/split-stream-items.js'
import { CircuitInputComposer } from './CircuitInputComposer.js'
import { PendingActionsDock } from './PendingActionsDock.js'
import { StreamList } from './StreamList.js'

export interface CircuitAgentStreamProps {
  taskId: string
  workspacePath: string
  feedEvents: FeedEventDto[]
  phases?: PhaseDto[]
  artifacts?: ArtifactDto[]
  decisionResolutions?: DecisionResolutionDto[]
  needsIntake?: boolean
  workflowStatus?: string
  workflowType?: string
  isRunning?: boolean
  needsReview?: boolean
  onResolveDecision?: (
    decisionId: string,
    optionId: string,
    optionLabel: string,
    phase?: string,
  ) => void
  onOpenReference?: (target: ReferenceTarget) => void
  onFocusWorkflowPanel?: () => void
  onOpenWorkflowOverview?: () => void
  onOpenPhase?: (phaseName: string) => void
  onApprovePhase?: (phaseName: string) => void
  onOpenArtifact?: (artifactId: string) => void
}

function persistedSteeringTexts(feedEvents: FeedEventDto[]): Set<string> {
  const texts = new Set<string>()
  for (const event of feedEvents) {
    if (event.type !== 'workflow:steering_received') continue
    const payload = event.payload as { rawText?: string }
    if (typeof payload.rawText === 'string') {
      texts.add(payload.rawText)
    }
  }
  return texts
}

function latestSteeringText(feedEvents: FeedEventDto[]): string | undefined {
  for (let index = feedEvents.length - 1; index >= 0; index -= 1) {
    const event = feedEvents[index]
    if (event?.type !== 'workflow:steering_received') continue
    const payload = event.payload as { rawText?: string }
    if (typeof payload.rawText === 'string') return payload.rawText
  }
  return undefined
}

function markHarnessResolved(current: Set<string>, cardId: string): Set<string> {
  const next = new Set(current)
  next.add(cardId)
  return next
}

function removePendingMessage(messages: LocalUserMessage[], text: string): LocalUserMessage[] {
  return messages.filter((message) => message.text !== text)
}

export function CircuitAgentStream({
  taskId,
  workspacePath,
  feedEvents,
  phases = [],
  artifacts = [],
  decisionResolutions = [],
  needsIntake = false,
  workflowType,
  isRunning: taskRunning = false,
  needsReview = false,
  onResolveDecision,
  onOpenReference,
  onFocusWorkflowPanel,
  onOpenWorkflowOverview,
  onOpenPhase,
  onOpenArtifact,
  onApprovePhase,
}: CircuitAgentStreamProps): React.ReactElement {
  const [pendingMessages, setPendingMessages] = useState<LocalUserMessage[]>([])
  const [resolvedHarnessIds, setResolvedHarnessIds] = useState<Set<string>>(() => new Set())
  const { liveActivities, phaseRunning, harnessSession } = useTaskStreamLive(taskId)
  const sendChatMessage = useSendChatMessage(taskId)
  const submitIntake = useSubmitTaskIntake(taskId)
  const startFollowUp = useStartFollowUpWorkflow(taskId)
  const applySteeringRevision = useApplySteeringRevision(taskId)
  const replyPermission = useReplyPermission(taskId, workspacePath)
  const replyQuestion = useReplyQuestion(taskId, workspacePath)
  const rejectQuestion = useRejectQuestion(taskId, workspacePath)
  const abortSession = useAbortSession(taskId)

  const agentRunning = taskRunning || phaseRunning

  const optimisticMessages = useMemo(() => {
    const persisted = persistedSteeringTexts(feedEvents)
    return pendingMessages.filter((message) => !persisted.has(message.text))
  }, [feedEvents, pendingMessages])

  const allItems = useTaskStreamItems(
    feedEvents,
    optimisticMessages,
    liveActivities,
    phases,
    workflowType as WorkflowType | undefined,
    artifacts,
  )
  const { chatItems, pendingActions: rawPendingActions } = useMemo(
    () => splitStreamItems(allItems),
    [allItems],
  )
  const hasVisibleLiveStream = useMemo(
    () =>
      chatItems.some(
        (item) =>
          (item.kind === 'activity_group' && item.live === true) ||
          (item.kind === 'reasoning' && item.isStreaming) ||
          (item.kind === 'subagent_run' && item.live === true),
      ),
    [chatItems],
  )
  const pendingActions = useMemo(
    () => rawPendingActions.filter((item) => !resolvedHarnessIds.has(item.id)),
    [rawPendingActions, resolvedHarnessIds],
  )

  const composerBusy =
    agentRunning ||
    sendChatMessage.isPending ||
    submitIntake.isPending ||
    applySteeringRevision.isPending ||
    replyPermission.isPending ||
    replyQuestion.isPending ||
    rejectQuestion.isPending ||
    abortSession.isPending

  const handleSend = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      setPendingMessages((current) => [
        ...current,
        {
          id: `pending-${Date.now()}`,
          text: trimmed,
          createdAt: new Date().toISOString(),
        },
      ])

      if (needsIntake) {
        submitIntake.mutate(
          { text: trimmed },
          {
            onSuccess: () => {
              setPendingMessages((current) => removePendingMessage(current, trimmed))
            },
          },
        )
        return
      }

      sendChatMessage.mutate(trimmed, {
        onSuccess: () => {
          setPendingMessages((current) => removePendingMessage(current, trimmed))
        },
      })
    },
    [needsIntake, sendChatMessage, submitIntake],
  )

  const handleStop = useCallback(() => {
    if (!harnessSession) return
    abortSession.mutate({
      sessionId: harnessSession.sessionId,
      workspacePath: harnessSession.workspacePath,
    })
  }, [abortSession, harnessSession])

  const handleStreamAction = useCallback(
    (action: StreamAction['action'], payload?: StreamAction['payload']): void => {
      if (action === 'decision.resolve') {
        const decisionId = payload?.decisionId
        const optionId = payload?.optionId
        const optionLabel = payload?.optionLabel
        const phase = typeof payload?.phase === 'string' ? payload.phase : undefined
        if (
          typeof decisionId === 'string' &&
          typeof optionId === 'string' &&
          typeof optionLabel === 'string'
        ) {
          onResolveDecision?.(decisionId, optionId, optionLabel, phase)
        }
        return
      }

      if (action === 'permission.reply') {
        const permissionId = payload?.permissionId
        const sessionId = payload?.sessionId
        const response = payload?.response
        if (
          typeof permissionId === 'string' &&
          typeof sessionId === 'string' &&
          (response === 'once' || response === 'always' || response === 'reject')
        ) {
          replyPermission.mutate(
            {
              permissionId,
              sessionId,
              response: response as PermissionReply,
            },
            {
              onSuccess: () => {
                setResolvedHarnessIds((current) =>
                  markHarnessResolved(current, `permission-${permissionId}`),
                )
              },
            },
          )
        }
        return
      }

      if (action === 'question.reply') {
        const requestId = payload?.requestId
        const sessionId = payload?.sessionId
        const selectedLabel = payload?.selectedLabel
        if (
          typeof requestId === 'string' &&
          typeof sessionId === 'string' &&
          typeof selectedLabel === 'string'
        ) {
          replyQuestion.mutate(
            {
              requestId,
              sessionId,
              answers: [[selectedLabel]],
            },
            {
              onSuccess: () => {
                setResolvedHarnessIds((current) =>
                  markHarnessResolved(current, `question-${requestId}`),
                )
              },
            },
          )
        }
        return
      }

      if (action === 'question.reject') {
        const requestId = payload?.requestId
        if (typeof requestId === 'string') {
          rejectQuestion.mutate(
            { requestId },
            {
              onSuccess: () => {
                setResolvedHarnessIds((current) =>
                  markHarnessResolved(current, `question-${requestId}`),
                )
              },
            },
          )
        }
        return
      }

      if (action === 'revision.infer') {
        const affectedPhase = payload?.affectedPhase
        const optionId = payload?.optionId
        const stalePhases = payload?.stalePhases
        if (
          typeof affectedPhase === 'string' &&
          typeof optionId === 'string' &&
          Array.isArray(stalePhases)
        ) {
          applySteeringRevision.mutate({
            affectedPhase,
            optionId,
            stalePhases: stalePhases.filter((entry): entry is string => typeof entry === 'string'),
            steeringText: latestSteeringText(feedEvents),
          })
        }
        return
      }

      if (action === 'workflow.openOverview') {
        onOpenWorkflowOverview?.()
        return
      }

      if (action === 'workflow.focusPanel') {
        onFocusWorkflowPanel?.()
        return
      }

      if (action === 'workflow.viewSummary') {
        const artifactId = payload?.artifactId
        if (typeof artifactId === 'string') {
          onOpenArtifact?.(artifactId)
        }
        return
      }

      if (action === 'workflow.startFollowUp') {
        startFollowUp.mutate({})
        onFocusWorkflowPanel?.()
        return
      }

      if (action === 'phase.open') {
        const phase = payload?.phase
        if (typeof phase === 'string') {
          onOpenPhase?.(phase)
        }
        return
      }

      if (action === 'phase.approve') {
        const phase = payload?.phase
        if (typeof phase === 'string') {
          onApprovePhase?.(phase)
        }
        return
      }
    },
    [
      applySteeringRevision,
      feedEvents,
      onApprovePhase,
      onFocusWorkflowPanel,
      onOpenArtifact,
      onOpenPhase,
      onOpenWorkflowOverview,
      onResolveDecision,
      rejectQuestion,
      replyPermission,
      replyQuestion,
      startFollowUp,
    ],
  )

  const handleOpenReference = (target: ReferenceTarget): void => {
    onOpenReference?.(target)
  }

  const intakePlaceholder = 'Message the agent — chat starts an OpenCode session on send'
  const reviewPlaceholder = 'Ask a question or tell the agent what to change…'
  const chatPlaceholder = 'Message the agent…'

  return (
    <aside className="flex h-full min-h-0 flex-col bg-card/30">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        {agentRunning && !hasVisibleLiveStream && (
          <div className="px-3 py-1 text-xs">
            <Shimmer duration={1.5}>Agent is thinking…</Shimmer>
          </div>
        )}

        <StreamList
          items={chatItems}
          decisionResolutions={decisionResolutions}
          emptyDescription={needsIntake ? intakePlaceholder : undefined}
          onStreamAction={handleStreamAction}
          onOpenReference={handleOpenReference}
        />

        <PendingActionsDock
          items={pendingActions}
          decisionResolutions={decisionResolutions}
          onStreamAction={handleStreamAction}
          onOpenReference={handleOpenReference}
        />

        <CircuitInputComposer
          disabled={composerBusy && !agentRunning}
          isRunning={agentRunning}
          placeholder={
            needsIntake ? intakePlaceholder : needsReview ? reviewPlaceholder : chatPlaceholder
          }
          onSend={handleSend}
          onStop={harnessSession ? handleStop : undefined}
        />
      </div>
    </aside>
  )
}
