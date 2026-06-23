import type { AgentMessageItem } from '@circuit/protocol'
import {
  cn,
  Message,
  MessageActions,
  MessageContent,
  MessageResponse,
} from '@circuit/ui'

import { CopyMessageAction } from './copy-message-action.js'
import { messageActionsClassName, mutedAssistantMessageClassName } from './shared-styles.js'

export function AgentMessageItemView({
  item,
  emphasized = true,
}: {
  item: AgentMessageItem
  emphasized?: boolean
}): React.ReactElement {
  return (
    <Message from="assistant">
      <MessageContent className={cn(!emphasized && mutedAssistantMessageClassName)}>
        <MessageResponse>{item.text}</MessageResponse>
        {item.isStreaming ? (
          <span className="inline-block w-2 animate-pulse text-primary">▍</span>
        ) : null}
      </MessageContent>
      <MessageActions className={messageActionsClassName}>
        <CopyMessageAction text={item.text} />
      </MessageActions>
    </Message>
  )
}
