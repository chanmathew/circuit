import { useEffect, useState } from 'react'

import type { ThemeTypes } from '@pierre/diffs'

/** Map Circuit document dark class to Pierre themeType. */
export function usePierreThemeType(): ThemeTypes {
  const [themeType, setThemeType] = useState<ThemeTypes>(() => readThemeType())

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setThemeType(readThemeType())
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return themeType
}

function readThemeType(): ThemeTypes {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}
