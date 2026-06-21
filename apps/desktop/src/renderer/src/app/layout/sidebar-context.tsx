import { createContext, useContext, useMemo, type ReactNode } from 'react'

export interface SidebarContextValue {
  open: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({
  open,
  onToggle,
  children,
}: {
  open: boolean
  onToggle: () => void
  children: ReactNode
}): React.ReactElement {
  const value = useMemo(() => ({ open, toggle: onToggle }), [open, onToggle])
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebar(): SidebarContextValue | null {
  return useContext(SidebarContext)
}
