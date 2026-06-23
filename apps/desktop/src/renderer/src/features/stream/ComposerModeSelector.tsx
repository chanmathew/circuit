import { HugeiconsIcon } from '@hugeicons/react'
import { Route01Icon } from '@hugeicons/core-free-icons'
import { useState } from 'react'

import {
  DEFAULT_TASK_MODE,
  getTaskModeLabel,
  TASK_MODE_OPTIONS,
  type TaskMode,
} from '@circuit/workflow'
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
  ModelSelectorTrigger,
  PromptInputButton,
} from '@circuit/ui'

export interface ComposerModeSelectorProps {
  taskMode?: TaskMode
  disabled?: boolean
  onTaskModeChange?: (taskMode: TaskMode) => void
}

export function ComposerModeSelector({
  taskMode = DEFAULT_TASK_MODE,
  disabled = false,
  onTaskModeChange,
}: ComposerModeSelectorProps): React.ReactElement {
  const [open, setOpen] = useState(false)

  const handleSelect = (nextMode: TaskMode): void => {
    onTaskModeChange?.(nextMode)
    setOpen(false)
  }

  return (
    <ModelSelector open={open} onOpenChange={setOpen}>
      <ModelSelectorTrigger asChild>
        <PromptInputButton type="button" disabled={disabled} tooltip="Task mode">
          <HugeiconsIcon icon={Route01Icon} strokeWidth={2} className="size-4 shrink-0" />
          <ModelSelectorName>{getTaskModeLabel(taskMode)}</ModelSelectorName>
        </PromptInputButton>
      </ModelSelectorTrigger>
      <ModelSelectorContent title="Mode">
        <ModelSelectorInput placeholder="Search modes…" />
        <ModelSelectorList>
          <ModelSelectorEmpty>No modes found.</ModelSelectorEmpty>
          <ModelSelectorGroup heading="Mode">
            {TASK_MODE_OPTIONS.map((option) => (
              <ModelSelectorItem
                key={option.value}
                value={option.label}
                onSelect={() => handleSelect(option.value)}
              >
                <ModelSelectorName>{option.label}</ModelSelectorName>
              </ModelSelectorItem>
            ))}
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  )
}
