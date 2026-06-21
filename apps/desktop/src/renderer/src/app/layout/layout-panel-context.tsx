import { createContext, useContext, useMemo, type ReactNode } from 'react'

export interface LayoutPanelContextValue {
  open: boolean
  toggle: () => void
}

const LayoutPanelContext = createContext<LayoutPanelContextValue | null>(null)

export function LayoutPanelProvider({
  open,
  onToggle,
  children,
}: {
  open: boolean
  onToggle: () => void
  children: ReactNode
}): React.ReactElement {
  const value = useMemo(() => ({ open, toggle: onToggle }), [open, onToggle])
  return <LayoutPanelContext.Provider value={value}>{children}</LayoutPanelContext.Provider>
}

export function useLayoutPanel(): LayoutPanelContextValue | null {
  return useContext(LayoutPanelContext)
}
