import { useState } from 'react'
import { Button, Textarea } from '@circuit/ui'

export interface ChangesCommitSectionProps {
  hasStagedChanges: boolean
  committing?: boolean
  onCommit: (message: string) => void
}

export function ChangesCommitSection({
  hasStagedChanges,
  committing = false,
  onCommit,
}: ChangesCommitSectionProps): React.ReactElement {
  const [message, setMessage] = useState('')

  const handleCommit = (): void => {
    const trimmed = message.trim()
    if (!trimmed || !hasStagedChanges) return
    onCommit(trimmed)
    setMessage('')
  }

  return (
    <section className="space-y-2">
      <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Commit
      </p>
      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Commit message…"
        className="min-h-[72px] resize-none text-xs"
        disabled={committing}
      />
      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={!hasStagedChanges || committing || message.trim().length === 0}
        onClick={handleCommit}
      >
        {committing ? 'Committing…' : 'Commit'}
      </Button>
    </section>
  )
}
