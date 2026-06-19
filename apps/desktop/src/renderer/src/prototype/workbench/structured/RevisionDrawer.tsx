import { Textarea } from '@circuit/ui'

import type { RevisionDraft, WorkbenchActions } from '../types.js'

interface RevisionFormProps {
  draft: RevisionDraft
  actions: WorkbenchActions
}

/** Revision input — submit/cancel live in the bottom bar. */
export function RevisionForm({ draft, actions }: RevisionFormProps): React.ReactElement {
  return (
    <Textarea
      value={draft.note}
      onChange={(e) => actions.setRevisionNote(e.target.value)}
      placeholder="What should change?"
      className="min-h-[72px] text-sm resize-none"
      autoFocus
    />
  )
}
