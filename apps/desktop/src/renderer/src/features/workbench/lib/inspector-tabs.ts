import type { InspectorTab } from '@circuit/protocol'
import type { IconSvgElement } from '@hugeicons/react'
import { Files01Icon, Route01Icon, WorkflowCircle04Icon } from '@hugeicons/core-free-icons'

export interface InspectorTabConfig {
  value: InspectorTab
  label: string
  icon: IconSvgElement
}

export const INSPECTOR_TABS: readonly InspectorTabConfig[] = [
  { value: 'workflow', label: 'Workflow', icon: Route01Icon },
  { value: 'files', label: 'Files', icon: Files01Icon },
  { value: 'changes', label: 'Changes', icon: WorkflowCircle04Icon },
] as const

/** Icon-only line-variant tab triggers — full chrome row height. */
export const INSPECTOR_TAB_TRIGGER_CLASS =
  '!flex-none h-10 w-9 min-w-9 shrink-0 items-center justify-center gap-0 rounded-none border-0 p-0 text-muted-foreground shadow-none hover:text-foreground data-active:bg-transparent data-active:text-foreground data-active:shadow-none after:!bottom-0'

/** Left-justified TabsList — matches chrome row height. */
export const INSPECTOR_TABS_LIST_CLASS =
  'inline-flex h-10 w-auto shrink-0 items-center justify-start gap-2 overflow-visible rounded-none border-0 bg-transparent px-2 py-0'
