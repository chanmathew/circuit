import type { UserMessageItem } from '@circuit/protocol'
import { cn, Message, MessageContent, MessageResponse } from '@circuit/ui'

import { mutedUserMessageClassName } from './shared-styles.js'

export function UserMessageItemView({
  item,
  emphasized = true,
}: {
  item: UserMessageItem
  emphasized?: boolean
}): React.ReactElement {
  return (
    <Message from="user">
      <MessageContent className={cn(!emphasized && mutedUserMessageClassName)}>
        <MessageResponse>{item.text}</MessageResponse>
      </MessageContent>
    </Message>
  )
}
