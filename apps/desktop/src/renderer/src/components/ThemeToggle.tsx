import { useState } from 'react'

import { Button } from '@circuit/ui'

import { getTheme, setTheme, type Theme } from '../lib/theme.js'

function SunIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
    </svg>
  )
}

function MoonIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6.2 2.5a5.5 5.5 0 1 0 6.3 8.3A4.5 4.5 0 0 1 6.2 2.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ThemeToggle(): React.ReactElement {
  const [theme, setThemeState] = useState<Theme>(() => getTheme())

  const toggle = (): void => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setThemeState(next)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 w-full justify-start gap-2 px-2 text-xs font-normal text-muted-foreground"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </Button>
  )
}
