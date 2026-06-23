import { useEffect, useRef } from 'react'

import { flashDiffHeader } from '../lib/pierre-diff-header.js'

function escapePathSelector(path: string): string {
  return typeof CSS !== 'undefined' && 'escape' in CSS ? CSS.escape(path) : path
}

function findFileScrollAnchor(container: HTMLElement, focusPath: string): HTMLElement | null {
  const row = container.querySelector(`[data-diff-file-path="${escapePathSelector(focusPath)}"]`)
  if (!(row instanceof HTMLElement)) return null

  const anchor = row.querySelector('[data-diff-file-scroll-anchor]')
  return anchor instanceof HTMLElement ? anchor : row
}

function findPatchDiffHost(container: HTMLElement, focusPath: string): HTMLElement | null {
  const row = container.querySelector(`[data-diff-file-path="${escapePathSelector(focusPath)}"]`)
  if (!(row instanceof HTMLElement)) return null

  const host = row.querySelector('[data-circuit-patch-diff-host]')
  return host instanceof HTMLElement ? host : null
}

function flashFileHeader(container: HTMLElement, focusPath: string): void {
  const tryFlash = (): boolean => {
    const host = findPatchDiffHost(container, focusPath)
    return host != null ? flashDiffHeader(host, focusPath) : false
  }

  if (tryFlash()) return

  window.setTimeout(() => {
    tryFlash()
  }, 150)
}

function scrollToFileAndFlashWhenVisible(
  container: HTMLElement,
  focusPath: string,
  onFlash: () => void,
): () => void {
  let flashed = false
  let observer: IntersectionObserver | undefined
  let observeDelay: number | undefined
  let retryScroll: number | undefined

  const cleanup = (): void => {
    observer?.disconnect()
    if (observeDelay != null) window.clearTimeout(observeDelay)
    if (retryScroll != null) window.clearTimeout(retryScroll)
  }

  const triggerFlash = (): void => {
    if (flashed) return
    flashed = true
    cleanup()
    onFlash()
  }

  const watchVisibility = (anchor: HTMLElement): void => {
    observer?.disconnect()
    observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        triggerFlash()
      },
      { root: container, threshold: [0, 1] },
    )
    observer.observe(anchor)
  }

  const scrollToAnchor = (): HTMLElement | null => {
    const anchor = findFileScrollAnchor(container, focusPath)
    anchor?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    return anchor
  }

  const anchor = scrollToAnchor()
  if (!anchor) {
    retryScroll = window.setTimeout(() => {
      const retried = scrollToAnchor()
      if (retried) observeDelay = window.setTimeout(() => watchVisibility(retried), 50)
    }, 150)
    return cleanup
  }

  observeDelay = window.setTimeout(() => watchVisibility(anchor), 50)
  retryScroll = window.setTimeout(scrollToAnchor, 150)

  return cleanup
}

export function useDiffFocusScroll({
  focusPath,
  enabled,
  patchCount,
  scrollContainerRef,
}: {
  focusPath?: string
  enabled: boolean
  patchCount: number
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
}): void {
  const flashSessionRef = useRef<{ focusPath: string | null; completed: boolean }>({
    focusPath: null,
    completed: false,
  })

  useEffect(() => {
    if (!focusPath || !enabled || patchCount === 0) return

    if (flashSessionRef.current.focusPath !== focusPath) {
      flashSessionRef.current = { focusPath, completed: false }
    }
    if (flashSessionRef.current.completed) return

    const container = scrollContainerRef.current
    if (!container) return

    return scrollToFileAndFlashWhenVisible(container, focusPath, () => {
      if (flashSessionRef.current.completed) return
      flashSessionRef.current.completed = true
      flashFileHeader(container, focusPath)
    })
  }, [enabled, focusPath, patchCount, scrollContainerRef])
}
