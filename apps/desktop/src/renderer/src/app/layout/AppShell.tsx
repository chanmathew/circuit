import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import {
  Panel,
  PanelGroup,
  type ImperativePanelHandle,
} from 'react-resizable-panels'

import { LayoutPanelResizeHandle } from './PanelResizeHandle.js'
import { ProjectTreeSidebar } from './ProjectTreeSidebar.js'
import { SidebarProvider } from './sidebar-context.js'
import { SidebarTopChrome } from './SidebarTopChrome.js'
import { TitleBar } from './TitleBar.js'

const SIDEBAR_DEFAULT_SIZE = 16

export function AppShell(): React.ReactElement {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isPrototype = pathname.startsWith('/prototype/')
  const isTaskDetail = /^\/tasks\/[^/]+$/.test(pathname)

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const sidebarRef = useRef<ImperativePanelHandle>(null)

  const toggleSidebar = useCallback((): void => {
    setSidebarOpen((open) => !open)
  }, [])

  useEffect(() => {
    const panel = sidebarRef.current
    if (!panel) return

    if (sidebarOpen) {
      if (panel.isCollapsed()) panel.expand()
      return
    }

    if (!panel.isCollapsed()) panel.collapse()
  }, [sidebarOpen])

  if (isPrototype) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
        <TitleBar insetTrafficLights />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider open={sidebarOpen} onToggle={toggleSidebar}>
      <PanelGroup
        direction="horizontal"
        className="h-full min-h-0 overflow-hidden bg-background text-foreground"
      >
        <Panel
          ref={sidebarRef}
          collapsible
          collapsedSize={0}
          defaultSize={SIDEBAR_DEFAULT_SIZE}
          minSize={12}
          maxSize={28}
          onExpand={() => setSidebarOpen(true)}
          onCollapse={() => setSidebarOpen(false)}
          className="h-full min-h-0 min-w-0"
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <SidebarTopChrome onToggle={toggleSidebar} />
            <ProjectTreeSidebar />
          </div>
        </Panel>

        {sidebarOpen ? <LayoutPanelResizeHandle /> : null}

        <Panel minSize={40} className="h-full min-h-0 min-w-0">
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {!isTaskDetail ? <TitleBar /> : null}
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <Outlet />
            </main>
          </div>
        </Panel>
      </PanelGroup>
    </SidebarProvider>
  )
}
