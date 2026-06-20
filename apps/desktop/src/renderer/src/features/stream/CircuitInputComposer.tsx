import { useState } from 'react'

import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from '@circuit/ui'

export interface CircuitInputComposerProps {
  disabled?: boolean
  placeholder?: string
  onSend: (text: string) => void
}

export function CircuitInputComposer({
  disabled = false,
  placeholder = 'Message the agent…',
  onSend,
}: CircuitInputComposerProps): React.ReactElement {
  const [draft, setDraft] = useState('')

  const handleSubmit = (message: PromptInputMessage): void => {
    const text = message.text.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  return (
    <div className="shrink-0 border-t border-border p-3">
      <PromptInput
        onSubmit={handleSubmit}
        className="relative w-full [&_[data-slot=input-group]]:rounded-md [&_[data-slot=input-group]]:border [&_[data-slot=input-group]]:border-border [&_[data-slot=input-group]]:bg-background"
      >
        <PromptInputTextarea
          value={draft}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            setDraft(event.currentTarget.value)
          }
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-16 resize-none pr-12 text-sm"
        />
        <PromptInputSubmit
          status="ready"
          disabled={disabled || !draft.trim()}
          className="absolute bottom-2 right-2"
        />
      </PromptInput>
    </div>
  )
}
