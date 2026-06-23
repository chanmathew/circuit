import { useEffect, useRef } from 'react'
import { Panel, PanelGroup, type ImperativePanelHandle } from 'react-resizable-panels'

import type React from 'react'

import { LayoutPanelResizeHandle } from '../../../app/layout/PanelResizeHandle.js'

/** Default inspector width when expanded. */
export const INSPECTOR_DEFAULT_EXPANDED_SIZE = 25

/** Default content panel width (diff, file, artifact) when expanded. */
export const CONTENT_DEFAULT_EXPANDED_SIZE = 58

/** Left workbench area when the inspector is expanded. */
const WORKBENCH_WITH_INSPECTOR_SIZE = 100 - INSPECTOR_DEFAULT_EXPANDED_SIZE

const STREAM_DEFAULT_SIZE = 100 - CONTENT_DEFAULT_EXPANDED_SIZE

export interface WorkbenchPanelLayoutProps {
  titleBar?: React.ReactNode
  stream: React.ReactNode
  content?: React.ReactNode
  inspector?: React.ReactNode
  showContent?: boolean
  showInspector?: boolean
  onInspectorExpand?: () => void
  onInspectorCollapse?: () => void
  /** Remount panel group when layout shape changes (avoids stale panel index errors). */
  layoutKey?: string
}

function useCollapsedPanel(
  expanded: boolean,
  enabled: boolean,
  expandedSize?: number,
): React.RefObject<ImperativePanelHandle | null> {
  const panelRef = useRef<ImperativePanelHandle>(null)

  useEffect(() => {
    if (!enabled) return
    const panel = panelRef.current
    if (!panel) return

    if (expanded) {
      if (panel.isCollapsed()) {
        if (expandedSize !== undefined) {
          panel.resize(expandedSize)
        } else {
          panel.expand()
        }
      }
      return
    }

    if (!panel.isCollapsed()) panel.collapse()
  }, [enabled, expanded, expandedSize])

  return panelRef
}

function StreamContentPanels({
  stream,
  content,
  showContent,
  contentRef,
  panelGroupKey,
}: {
  stream: React.ReactNode
  content?: React.ReactNode
  showContent: boolean
  contentRef: React.RefObject<ImperativePanelHandle | null>
  panelGroupKey: string
}): React.ReactElement {
  const hasContent = Boolean(content)

  if (!hasContent) {
    return <div className="relative min-h-0 flex-1">{stream}</div>
  }

  return (
    <PanelGroup key={panelGroupKey} direction="horizontal" className="min-h-0 flex-1">
      <Panel defaultSize={STREAM_DEFAULT_SIZE} minSize={28} className="h-full min-h-0 min-w-0">
        {stream}
      </Panel>
      <LayoutPanelResizeHandle />
      <Panel
        ref={contentRef}
        id="workbench-content"
        collapsible
        collapsedSize={0}
        defaultSize={showContent ? CONTENT_DEFAULT_EXPANDED_SIZE : 0}
        minSize={28}
        className="h-full min-h-0 min-w-0"
      >
        {content}
      </Panel>
    </PanelGroup>
  )
}

export function WorkbenchPanelLayout({
  titleBar,
  stream,
  content,
  inspector,
  showContent = true,
  showInspector = true,
  onInspectorExpand,
  onInspectorCollapse,
  layoutKey,
}: WorkbenchPanelLayoutProps): React.ReactElement {
  const hasContent = Boolean(content)
  const hasInspector = Boolean(inspector)
  const contentRef = useCollapsedPanel(showContent, hasContent, CONTENT_DEFAULT_EXPANDED_SIZE)
  const inspectorRef = useCollapsedPanel(
    showInspector,
    hasInspector,
    INSPECTOR_DEFAULT_EXPANDED_SIZE,
  )

  const panelGroupKey =
    layoutKey ??
    `${hasContent ? 'content' : 'no-content'}-${hasInspector ? 'inspector' : 'no-inspector'}`

  if (!hasContent && !hasInspector) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {titleBar}
        <div className="relative min-h-0 flex-1">{stream}</div>
      </div>
    )
  }

  if (hasInspector) {
    return (
      <PanelGroup
        key={`${panelGroupKey}-with-inspector`}
        direction="horizontal"
        className="h-full min-h-0 flex-1"
      >
        <Panel
          defaultSize={showInspector ? WORKBENCH_WITH_INSPECTOR_SIZE : 100}
          minSize={40}
          className="h-full min-h-0 min-w-0"
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {titleBar}
            <StreamContentPanels
              stream={stream}
              content={content}
              showContent={showContent}
              contentRef={contentRef}
              panelGroupKey={`${panelGroupKey}-stream-content`}
            />
          </div>
        </Panel>

        {showInspector ? <LayoutPanelResizeHandle /> : null}

        <Panel
          ref={inspectorRef}
          id="workbench-inspector"
          order={2}
          collapsible
          collapsedSize={0}
          defaultSize={INSPECTOR_DEFAULT_EXPANDED_SIZE}
          minSize={16}
          maxSize={40}
          onExpand={onInspectorExpand}
          onCollapse={onInspectorCollapse}
          className="h-full min-h-0 min-w-0"
        >
          {inspector}
        </Panel>
      </PanelGroup>
    )
  }

  if (hasContent && !hasInspector) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {titleBar}
        <StreamContentPanels
          stream={stream}
          content={content}
          showContent={showContent}
          contentRef={contentRef}
          panelGroupKey={panelGroupKey}
        />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {titleBar}
      <div className="relative min-h-0 flex-1">{stream}</div>
    </div>
  )
}
