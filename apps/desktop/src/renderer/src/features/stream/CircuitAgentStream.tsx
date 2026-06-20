import { useCallback, useMemo, useState } from 'react'

import type { ReferenceTarget, StreamAction } from '@circuit/protocol'
import type { ComposerMode, DecisionResolutionDto, FeedEventDto, PermissionReply } from '../../../../shared/api.js'
import { useSubmitTaskIntake } from '../tasks/hooks/useSubmitTaskIntake.js'
import { useApplySteeringRevision } from './hooks/useApplySteeringRevision.js'
import { useAbortSession } from './hooks/useAbortSession.js'
import { useRecordSteering } from './hooks/useRecordSteering.js'
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
  decisionResolutions?: DecisionResolutionDto[]
  needsIntake?: boolean
  /** Freeform task — composer sends to persistent harness chat session. */
  freeform?: boolean
  isRunning?: boolean
  onResolveDecision?: (
    decisionId: string,
    optionId: string,
    optionLabel: string,
    phase?: string,
  ) => void
  onOpenReference?: (target: ReferenceTarget) => void
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
  decisionResolutions = [],
  needsIntake = false,
  freeform = false,
  isRunning: taskRunning = false,
  onResolveDecision,
  onOpenReference,
}: CircuitAgentStreamProps): React.ReactElement {
  const [pendingMessages, setPendingMessages] = useState<LocalUserMessage[]>([])
  const [composerMode, setComposerMode] = useState<ComposerMode>('chat')
  const [resolvedHarnessIds, setResolvedHarnessIds] = useState<Set<string>>(() => new Set())
  const { liveActivities, phaseRunning, harnessSession } = useTaskStreamLive(taskId)
  const recordSteering = useRecordSteering(taskId)
  const sendChatMessage = useSendChatMessage(taskId)
  const submitIntake = useSubmitTaskIntake(taskId)
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

  const allItems = useTaskStreamItems(feedEvents, optimisticMessages, liveActivities)
  const { chatItems, pendingActions: rawPendingActions } = useMemo(
    () => splitStreamItems(allItems),
    [allItems],
  )
  const pendingActions = useMemo(
    () => rawPendingActions.filter((item) => !resolvedHarnessIds.has(item.id)),
    [rawPendingActions, resolvedHarnessIds],
  )

  const composerBusy =
    agentRunning ||
    recordSteering.isPending ||
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
          { text: trimmed, mode: composerMode },
          {
            onSuccess: () => {
              setPendingMessages((current) => removePendingMessage(current, trimmed))
            },
          },
        )
        return
      }

      if (freeform) {
        sendChatMessage.mutate(trimmed, {
          onSuccess: () => {
            setPendingMessages((current) => removePendingMessage(current, trimmed))
          },
        })
        return
      }

      recordSteering.mutate(trimmed, {
        onSuccess: () => {
          setPendingMessages((current) => removePendingMessage(current, trimmed))
        },
      })
    },
    [composerMode, freeform, needsIntake, recordSteering, sendChatMessage, submitIntake],
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
      }
    },
    [applySteeringRevision, feedEvents, onResolveDecision, rejectQuestion, replyPermission, replyQuestion],
  )

  const handleOpenReference = (target: ReferenceTarget): void => {
    onOpenReference?.(target)
  }

  const intakePlaceholder =
    composerMode === 'plan'
      ? 'Describe the change — Plan mode bootstraps phases and artifacts'
      : 'Message the agent — chat starts an OpenCode session on send'

  const chatPlaceholder = 'Message the agent…'

  return (
    <aside className="flex h-full min-h-0 flex-col bg-card/30">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Agent stream
          </p>
          {agentRunning && (
            <p className="text-[10px] font-medium text-primary">Agent running…</p>
          )}
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <StreamList
          items={chatItems}
          decisionResolutions={decisionResolutions}
          emptyDescription={
            needsIntake
              ? intakePlaceholder
              : undefined
          }
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
          showModeSelector={needsIntake}
          mode={composerMode}
          onModeChange={setComposerMode}
          placeholder={needsIntake ? intakePlaceholder : freeform ? chatPlaceholder : undefined}
          onSend={handleSend}
          onStop={harnessSession ? handleStop : undefined}
        />
      </div>
    </aside>
  )
}
