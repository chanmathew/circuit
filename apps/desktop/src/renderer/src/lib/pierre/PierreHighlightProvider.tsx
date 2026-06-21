import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { getFiletypeFromFileName, preloadHighlighter, type FileContents } from '@pierre/diffs'

import { COMMON_PIERRE_LANGS } from './pierre-highlighter-langs.js'

const PIERRE_THEMES = ['pierre-dark', 'pierre-light'] as const
const COMMON_LANG_SET = new Set<string>(COMMON_PIERRE_LANGS)

type PierreHighlightContextValue = {
  whenReady: () => Promise<void>
}

const PierreHighlightContext = createContext<PierreHighlightContextValue | null>(null)

/** Preloads Shiki themes/languages for synchronous Pierre rendering on first paint. */
export function PierreHighlightProvider({ children }: { children: ReactNode }): React.ReactElement {
  const preloadRef = useRef<Promise<void> | null>(null)

  const whenReady = useCallback((): Promise<void> => {
    preloadRef.current ??= preloadHighlighter({
      themes: [...PIERRE_THEMES],
      langs: [...COMMON_PIERRE_LANGS],
    }).then(() => undefined)
    return preloadRef.current
  }, [])

  useEffect(() => {
    void whenReady()
  }, [whenReady])

  return (
    <PierreHighlightContext.Provider value={{ whenReady }}>
      {children}
    </PierreHighlightContext.Provider>
  )
}

function usePierreHighlightContext(): PierreHighlightContextValue {
  const context = useContext(PierreHighlightContext)
  if (context == null) {
    throw new Error('Pierre highlight hooks must be used within PierreHighlightProvider')
  }
  return context
}

/** True once global + file-language highlighter preload has finished. */
export function usePierreFileHighlightReady(file: FileContents | undefined): boolean {
  const { whenReady } = usePierreHighlightContext()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!file) {
      setReady(false)
      return
    }

    let cancelled = false
    setReady(false)

    const lang = file.lang ?? getFiletypeFromFileName(file.name)

    void (async () => {
      await whenReady()
      if (!cancelled && lang !== 'text' && !COMMON_LANG_SET.has(lang)) {
        await preloadHighlighter({
          themes: [...PIERRE_THEMES],
          langs: [lang],
        })
      }
      if (!cancelled) setReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [file?.cacheKey, whenReady])

  return ready
}

/** True once the shared highlighter preload has finished (enough for diffs). */
export function usePierreGlobalHighlightReady(): boolean {
  const { whenReady } = usePierreHighlightContext()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void whenReady().then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [whenReady])

  return ready
}
