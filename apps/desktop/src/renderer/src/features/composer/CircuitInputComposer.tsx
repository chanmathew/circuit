import { useState } from 'react'

import type { TaskMode } from '@circuit/workflow'
import {
  Badge,
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionAddScreenshot,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  type PromptInputMessage,
} from '@circuit/ui'

import type { RepoDto } from '../../../../shared/api.js'
import { ComposerModeSelector } from './ComposerModeSelector.js'
import { ComposerProjectSelector } from './ComposerProjectSelector.js'

/** Scaffold list — wire to harness model discovery later. */
export const COMPOSER_MODELS = [
  {
    id: 'anthropic/claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
  },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openai' },
] as const

export type ComposerModelId = (typeof COMPOSER_MODELS)[number]['id']

export interface CircuitInputComposerProps {
  disabled?: boolean
  isRunning?: boolean
  placeholder?: string
  model?: ComposerModelId
  onModelChange?: (model: ComposerModelId) => void
  repos?: RepoDto[]
  repoId?: string
  onRepoChange?: (repoId: string) => void
  onAddRepo?: () => void
  taskMode?: TaskMode
  onTaskModeChange?: (taskMode: TaskMode) => void
  taskModeDisabled?: boolean
  taskModeError?: string
  onSend: (text: string) => void
  onStop?: () => void
}

function ComposerAttachmentHeader(): React.ReactElement | null {
  const attachments = usePromptInputAttachments()

  if (attachments.files.length === 0) {
    return null
  }

  return (
    <PromptInputHeader>
      <div className="flex flex-wrap gap-1">
        {attachments.files.map((file) => (
          <Badge key={file.id} variant="secondary" className="gap-1 pr-1 font-normal">
            <span className="max-w-40 truncate">{file.filename ?? 'Attachment'}</span>
            <button
              type="button"
              aria-label={`Remove ${file.filename ?? 'attachment'}`}
              className="rounded-sm px-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => attachments.remove(file.id)}
            >
              ×
            </button>
          </Badge>
        ))}
      </div>
    </PromptInputHeader>
  )
}

export function CircuitInputComposer({
  disabled = false,
  isRunning = false,
  placeholder = 'Message the agent…',
  model,
  onModelChange,
  repos,
  repoId,
  onRepoChange,
  onAddRepo,
  taskMode,
  onTaskModeChange,
  taskModeDisabled = false,
  taskModeError,
  onSend,
  onStop,
}: CircuitInputComposerProps): React.ReactElement {
  const [draft, setDraft] = useState('')
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [internalModel, setInternalModel] = useState<ComposerModelId>(COMPOSER_MODELS[0].id)
  const selectedModel = model ?? internalModel
  const selectedModelData =
    COMPOSER_MODELS.find((entry) => entry.id === selectedModel) ?? COMPOSER_MODELS[0]
  const toolbarDisabled = disabled || isRunning

  const handleModelChange = (value: ComposerModelId): void => {
    onModelChange?.(value)
    if (model === undefined) {
      setInternalModel(value)
    }
    setModelMenuOpen(false)
  }

  const handleSubmit = (message: PromptInputMessage): void => {
    if (isRunning) {
      onStop?.()
      return
    }
    const text = message.text.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  const submitStatus = isRunning ? 'streaming' : disabled ? 'submitted' : 'ready'
  const requiresRepo = repos !== undefined
  const canSend = draft.trim().length > 0 && (!requiresRepo || Boolean(repoId))

  return (
    <div className="shrink-0 border-t border-border p-3">
      {taskModeError ? (
        <p className="mb-2 px-1 text-xs text-destructive">{taskModeError}</p>
      ) : null}
      <PromptInput onSubmit={handleSubmit} className="w-full" multiple>
        <ComposerAttachmentHeader />
        <PromptInputBody>
          <PromptInputTextarea
            value={draft}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
              setDraft(event.currentTarget.value)
            }
            placeholder={isRunning ? 'Agent running…' : placeholder}
            disabled={disabled && !isRunning}
            className="text-sm"
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger disabled={toolbarDisabled} />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments disabled={toolbarDisabled} />
                <PromptInputActionAddScreenshot disabled={toolbarDisabled} />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>

            {repos != null ? (
              <ComposerProjectSelector
                repos={repos}
                repoId={repoId}
                disabled={toolbarDisabled}
                onRepoChange={onRepoChange}
                onAddRepo={onAddRepo}
              />
            ) : null}

            <ComposerModeSelector
              taskMode={taskMode}
              disabled={toolbarDisabled || taskModeDisabled}
              onTaskModeChange={onTaskModeChange}
            />

            <ModelSelector open={modelMenuOpen} onOpenChange={setModelMenuOpen}>
              <ModelSelectorTrigger asChild>
                <PromptInputButton
                  type="button"
                  disabled={toolbarDisabled}
                  tooltip="Select model"
                >
                  <ModelSelectorLogoGroup>
                    <ModelSelectorLogo provider={selectedModelData.provider} />
                  </ModelSelectorLogoGroup>
                  <ModelSelectorName>{selectedModelData.name}</ModelSelectorName>
                </PromptInputButton>
              </ModelSelectorTrigger>
              <ModelSelectorContent title="Select model">
                <ModelSelectorInput placeholder="Search models…" />
                <ModelSelectorList>
                  <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                  <ModelSelectorGroup heading="Models">
                    {COMPOSER_MODELS.map((entry) => (
                      <ModelSelectorItem
                        key={entry.id}
                        value={entry.name}
                        onSelect={() => handleModelChange(entry.id)}
                      >
                        <ModelSelectorLogo provider={entry.provider} />
                        <ModelSelectorName>{entry.name}</ModelSelectorName>
                      </ModelSelectorItem>
                    ))}
                  </ModelSelectorGroup>
                </ModelSelectorList>
              </ModelSelectorContent>
            </ModelSelector>
          </PromptInputTools>
          <PromptInputSubmit
            status={submitStatus}
            disabled={!isRunning && (disabled || !canSend)}
            onStop={onStop}
            className="shrink-0"
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
