import type { StreamItem, ReferenceTarget, StreamAction } from '@circuit/protocol'

import type { DecisionResolutionDto } from '../../../../shared/api.js'
import {
  ActionCardItemView,
  ActivityGroupItemView,
  AgentMessageItemView,
  ReasoningItemView,
  ReferenceCardItemView,
  SubagentRunItemView,
  UserMessageItemView,
  type StreamItemContext,
} from './StreamItemViews.js'

export interface StreamItemRendererProps {
  item: StreamItem
  workspacePath?: string
  decisionResolutions?: DecisionResolutionDto[]
  onStreamAction?: (action: StreamAction['action'], payload?: StreamAction['payload']) => void
  onOpenReference?: (target: ReferenceTarget) => void
  onOpenChangedFile?: (path: string) => void
}

export function StreamItemRenderer({
  item,
  workspacePath,
  decisionResolutions,
  onStreamAction,
  onOpenReference,
  onOpenChangedFile,
}: StreamItemRendererProps): React.ReactElement {
  const context: StreamItemContext = {
    workspacePath,
    decisionResolutions,
    onStreamAction,
    onOpenReference,
    onOpenChangedFile,
  }

  switch (item.kind) {
    case 'user_message':
      return <UserMessageItemView item={item} />
    case 'agent_message':
      return <AgentMessageItemView item={item} />
    case 'reasoning':
      return <ReasoningItemView item={item} />
    case 'activity_group':
      return <ActivityGroupItemView item={item} context={context} />
    case 'subagent_run':
      return <SubagentRunItemView item={item} context={context} />
    case 'action_card':
      return <ActionCardItemView item={item} context={context} />
    case 'reference_card':
      return <ReferenceCardItemView item={item} context={context} />
  }
}
