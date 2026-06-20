import type { StreamItem, ReferenceTarget, StreamAction } from '@circuit/protocol'

import type { DecisionResolutionDto } from '../../../../shared/api.js'
import {
  ActionCardItemView,
  ActivityGroupItemView,
  AgentMessageItemView,
  ReferenceCardItemView,
  UserMessageItemView,
  type StreamItemContext,
} from './StreamItemViews.js'

export interface StreamItemRendererProps {
  item: StreamItem
  decisionResolutions?: DecisionResolutionDto[]
  onStreamAction?: (action: StreamAction['action'], payload?: StreamAction['payload']) => void
  onOpenReference?: (target: ReferenceTarget) => void
}

export function StreamItemRenderer({
  item,
  decisionResolutions,
  onStreamAction,
  onOpenReference,
}: StreamItemRendererProps): React.ReactElement {
  const context: StreamItemContext = {
    decisionResolutions,
    onStreamAction,
    onOpenReference,
  }

  switch (item.kind) {
    case 'user_message':
      return <UserMessageItemView item={item} />
    case 'agent_message':
      return <AgentMessageItemView item={item} />
    case 'activity_group':
      return <ActivityGroupItemView item={item} />
    case 'action_card':
      return <ActionCardItemView item={item} context={context} />
    case 'reference_card':
      return <ReferenceCardItemView item={item} context={context} />
  }
}
