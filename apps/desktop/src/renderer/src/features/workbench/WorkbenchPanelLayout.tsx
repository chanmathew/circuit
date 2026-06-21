import { useEffect, useRef } from 'react'
import {
  Panel,
  PanelGroup,
  type ImperativePanelHandle,
} from 'react-resizable-panels'

import type { InspectorTab } from '@circuit/protocol'
import type React from 'react'

import { LayoutPanelResizeHandle } from '../../app/layout/PanelResizeHandle.js'
import {
  CollapsedInspectorStrip,
} from './InspectorPanelToggle.js'

/** Percent width of the inspector rail when collapsed (fits icon buttons ~44px). */
const INSPECTOR_COLLAPSED_STRIP_SIZE = 4

export interface WorkbenchPanelLayoutProps {
  stream: React.ReactNode
  content?: React.ReactNode
  inspector?: React.ReactNode
  showContent?: boolean
  showInspector?: boolean
  onToggleInspector?: () => void
  /** Sync open state when the user drags the inspector past collapsed width. */
  onInspectorExpand?: () => void
  onInspectorCollapse?: () => void
  inspectorActiveTab?: InspectorTab
  onInspectorTabSelect?: (tab: InspectorTab) => void
  /** Remount panel group when layout shape changes (avoids stale panel index errors). */
  layoutKey?: string
}

function useCollapsedPanel(
  expanded: boolean,
  enabled: boolean,
): React.RefObject<ImperativePanelHandle | null> {
  const panelRef = useRef<ImperativePanelHandle>(null)

  useEffect(() => {
    if (!enabled) return
    const panel = panelRef.current
    if (!panel) return

    if (expanded) {
      if (panel.isCollapsed()) panel.expand()
      return
    }

    if (!panel.isCollapsed()) panel.collapse()
  }, [enabled, expanded])

  return panelRef
}

export function WorkbenchPanelLayout({
  stream,
  content,
  inspector,
  showContent = true,
  showInspector = true,
  onToggleInspector,
  onInspectorExpand,
  onInspectorCollapse,
  inspectorActiveTab,
  onInspectorTabSelect,
  layoutKey,
}: WorkbenchPanelLayoutProps): React.ReactElement {
  const hasContent = Boolean(content)
  const hasInspector = Boolean(inspector)
  const contentRef = useCollapsedPanel(showContent, hasContent)
  const inspectorRef = useCollapsedPanel(showInspector, hasInspector)

  const panelGroupKey =
    layoutKey ?? `${hasContent ? 'content' : 'no-content'}-${hasInspector ? 'inspector' : 'no-inspector'}`

  if (!hasContent && !hasInspector) {
    return <div className="relative h-full min-h-0 flex-1">{stream}</div>
  }

  if (hasContent && !hasInspector) {
    return (
      <div className="relative h-full min-h-0 flex-1">
        <PanelGroup key={panelGroupKey} direction="horizontal" className="h-full min-h-0 flex-1">
          <Panel defaultSize={42} minSize={28} className="h-full min-h-0 min-w-0">
            {stream}
          </Panel>
          <LayoutPanelResizeHandle />
          <Panel
            ref={contentRef}
            collapsible
            collapsedSize={0}
            defaultSize={showContent ? 58 : 0}
            minSize={28}
            className="h-full min-h-0 min-w-0"
          >
            {content}
          </Panel>
        </PanelGroup>
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-0 flex-1">
      <PanelGroup key={panelGroupKey} direction="horizontal" className="h-full min-h-0 flex-1">
        <Panel defaultSize={32} minSize={18} maxSize={42} className="h-full min-h-0 min-w-0">
          {stream}
        </Panel>

        <LayoutPanelResizeHandle />

        <Panel
          ref={contentRef}
          collapsible
          collapsedSize={0}
          defaultSize={showContent ? 43 : 0}
          minSize={28}
          className="h-full min-h-0 min-w-0"
        >
          {content}
        </Panel>

        {hasInspector ? (
          <>
            <LayoutPanelResizeHandle />
            <Panel
              ref={inspectorRef}
              id="workbench-inspector"
              order={3}
              collapsible
              collapsedSize={INSPECTOR_COLLAPSED_STRIP_SIZE}
              defaultSize={showInspector ? 25 : INSPECTOR_COLLAPSED_STRIP_SIZE}
              minSize={16}
              maxSize={40}
              onExpand={onInspectorExpand}
              onCollapse={onInspectorCollapse}
              className="h-full min-h-0 min-w-0"
            >
              <div className="relative h-full min-h-0">
                <div className={showInspector ? 'h-full min-h-0' : 'hidden'} aria-hidden={!showInspector}>
                  {inspector}
                </div>
                {!showInspector &&
                onToggleInspector &&
                inspectorActiveTab &&
                onInspectorTabSelect ? (
                  <CollapsedInspectorStrip
                    activeTab={inspectorActiveTab}
                    onToggle={onToggleInspector}
                    onTabSelect={onInspectorTabSelect}
                  />
                ) : null}
              </div>
            </Panel>
          </>
        ) : null}
      </PanelGroup>
    </div>
  )
}
