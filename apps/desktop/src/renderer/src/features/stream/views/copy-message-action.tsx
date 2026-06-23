import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Copy01Icon, Tick02Icon } from '@hugeicons/core-free-icons'

import { MessageAction } from '@circuit/ui'

export function CopyMessageAction({ text }: { text: string }): React.ReactElement {
  const [copied, setCopied] = useState(false)

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <MessageAction
      tooltip={copied ? 'Copied' : 'Copy'}
      label={copied ? 'Copied' : 'Copy'}
      onClick={handleCopy}
    >
      {copied ? (
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-3" />
      ) : (
        <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-3" />
      )}
    </MessageAction>
  )
}
