import { Panel, PanelGroup } from 'react-resizable-panels'

import { LayoutPanelResizeHandle } from '../../app/layout/PanelResizeHandle.js'

export interface WorkbenchPanelLayoutProps {
  stream: React.ReactNode
  content?: React.ReactNode
  inspector?: React.ReactNode
  showContent?: boolean
  showInspector?: boolean
  /** Remount panel group when layout shape changes (avoids stale panel index errors). */
  layoutKey?: string
}

export function WorkbenchPanelLayout({
  stream,
  content,
  inspector,
  showContent = true,
  showInspector = true,
  layoutKey,
}: WorkbenchPanelLayoutProps): React.ReactElement {
  const panelGroupKey = layoutKey ?? `${showContent}-${showInspector}`
  if (!showContent && !showInspector) {
    return <div className="h-full min-h-0 flex-1">{stream}</div>
  }

  if (!showContent && showInspector && inspector) {
    return (
      <PanelGroup key={panelGroupKey} direction="horizontal" className="h-full min-h-0 flex-1">
        <Panel defaultSize={68} minSize={40} className="h-full min-h-0 min-w-0">
          {stream}
        </Panel>
        <LayoutPanelResizeHandle />
        <Panel defaultSize={32} minSize={20} maxSize={45} className="h-full min-h-0 min-w-0">
          {inspector}
        </Panel>
      </PanelGroup>
    )
  }

  if (showContent && !showInspector && content) {
    return (
      <PanelGroup key={panelGroupKey} direction="horizontal" className="h-full min-h-0 flex-1">
        <Panel defaultSize={40} minSize={24} className="h-full min-h-0 min-w-0">
          {stream}
        </Panel>
        <LayoutPanelResizeHandle />
        <Panel defaultSize={60} minSize={32} className="h-full min-h-0 min-w-0">
          {content}
        </Panel>
      </PanelGroup>
    )
  }

  return (
    <PanelGroup key={panelGroupKey} direction="horizontal" className="h-full min-h-0 flex-1">
      <Panel defaultSize={32} minSize={18} maxSize={42} className="h-full min-h-0 min-w-0">
        {stream}
      </Panel>

      <LayoutPanelResizeHandle />

      <Panel defaultSize={43} minSize={28} className="h-full min-h-0 min-w-0">
        {content}
      </Panel>

      <LayoutPanelResizeHandle />

      <Panel defaultSize={25} minSize={16} maxSize={40} className="h-full min-h-0 min-w-0">
        {inspector}
      </Panel>
    </PanelGroup>
  )
}
