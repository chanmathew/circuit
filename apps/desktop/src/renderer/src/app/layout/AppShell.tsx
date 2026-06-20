import { Outlet, useRouterState } from '@tanstack/react-router'

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
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <ProjectTreeSidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
