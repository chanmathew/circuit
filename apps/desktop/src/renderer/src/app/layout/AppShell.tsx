import { Outlet, useRouterState } from '@tanstack/react-router'
import { Panel, PanelGroup } from 'react-resizable-panels'

import { LayoutPanelResizeHandle } from './PanelResizeHandle.js'
import { ProjectTreeSidebar } from './ProjectTreeSidebar.js'

export function AppShell(): React.ReactElement {
  const isPrototype = useRouterState({
    select: (s) => s.location.pathname.startsWith('/prototype/'),
  })

  if (isPrototype) {
    return (
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Outlet />
      </div>
    )
  }

  return (
    <PanelGroup
      direction="horizontal"
      className="h-full overflow-hidden bg-background text-foreground"
    >
      <Panel defaultSize={16} minSize={12} maxSize={28} className="h-full min-h-0 min-w-0">
        <ProjectTreeSidebar />
      </Panel>

      <LayoutPanelResizeHandle />

      <Panel minSize={40} className="h-full min-h-0 min-w-0">
        <main className="flex h-full min-h-0 flex-col overflow-hidden">
          <Outlet />
        </main>
      </Panel>
    </PanelGroup>
  )
}
