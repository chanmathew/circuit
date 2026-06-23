import type { ReasoningItem } from '@circuit/protocol'
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@circuit/ui'

export function ReasoningItemView({ item }: { item: ReasoningItem }): React.ReactElement {
  return (
    <Reasoning isStreaming={item.isStreaming} defaultOpen={false}>
      <ReasoningTrigger />
      <ReasoningContent>{item.text}</ReasoningContent>
    </Reasoning>
  )
}
