import type { FileDiffMetadata, ThemeTypes } from '@pierre/diffs'

import { resolveDiffFilePath } from './diff-file-path.js'
import { pierreDiffViewerOptions } from '../../../lib/pierre/pierre-viewer-options.js'

export const DIFF_HEADER_FLASH_CLASS = 'circuit-diff-header-flash'

export const DIFF_HEADER_CSS = `
[data-title], [data-prev-name] {
  cursor: pointer;
}
[data-title]:hover bdi,
[data-prev-name]:hover bdi {
  text-decoration: underline;
}
[data-diffs-header=default] {
  padding-inline: 0;
  padding-block: 6px;
  min-height: calc(1lh + 20px);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
[data-diffs-header=default] [data-header-content] {
  flex: 0 1 auto;
  min-width: 0;
  padding-left: 12px;
}
[data-diffs-header=default] [data-title] {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-diffs-header=default] [data-metadata] {
  flex: 1 1 auto;
  display: flex;
  min-width: 0;
  align-items: center;
  padding-right: 12px;
}
[data-diffs-header=default] [data-metadata] > [data-deletions-count]:first-child,
[data-diffs-header=default] [data-metadata] > [data-additions-count]:first-child {
  margin-left: 0;
}
[data-diffs-header=default] [data-deletions-count] + [data-additions-count] {
  margin-left: 6px;
}
[data-diffs-header=default] [data-metadata] > slot[name='header-metadata'] {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  align-items: center;
  margin-left: 0;
}
[data-diffs-header=default] slot[name='header-metadata']::slotted(div) {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  align-items: center;
  width: 100%;
}
[data-diffs-header=default] [data-additions-count],
[data-diffs-header=default] [data-deletions-count] {
  font-size: 10px;
  line-height: 1;
}
[data-diffs-header=default] [data-metadata] > [data-deletions-count],
[data-diffs-header=default] [data-metadata] > [data-additions-count] {
  display: none;
}
[data-diffs-header=default] [data-code],
[data-diffs-header=default] ~ [data-diff] [data-code] {
  padding-top: 0;
  padding-bottom: 0;
}
@keyframes circuit-diff-header-flash {
  0% {
    background-color: rgb(245 158 11 / 0.38);
  }
  100% {
    background-color: transparent;
  }
}
[data-diffs-header=default].${DIFF_HEADER_FLASH_CLASS} {
  animation: circuit-diff-header-flash 1.1s ease-out;
}
`

const FLASH_DEDUPE_MS = 2_000

interface PierreDiffHeaderState {
  fileLinkHandler?: (event: Event) => void
  collapseHandler?: (event: Event) => void
  onPathClick?: (path: string) => void
  onToggleCollapse?: () => void
  lastFlashKey?: string
  lastFlashAt?: number
}

const headerState = new WeakMap<HTMLElement, PierreDiffHeaderState>()

function diffQueryRoot(container: HTMLElement): ParentNode {
  return container.shadowRoot ?? container
}

function diffHeaderElement(container: HTMLElement): HTMLElement | null {
  const header = diffQueryRoot(container).querySelector('[data-diffs-header]')
  return header instanceof HTMLElement ? header : null
}

function isInteractiveTarget(target: Element): boolean {
  return (
    target.closest(
      '[data-circuit-diff-action], [data-title], [data-prev-name], input, button, label, a',
    ) != null
  )
}

function getHeaderState(container: HTMLElement): PierreDiffHeaderState {
  let state = headerState.get(container)
  if (!state) {
    state = {}
    headerState.set(container, state)
  }
  return state
}

export interface PierreDiffHeaderBehavior {
  knownPaths?: readonly string[]
  fileDiff?: Pick<FileDiffMetadata, 'name' | 'prevName'>
  onPathClick?: (path: string) => void
  onToggleCollapse?: () => void
  markPatchHost?: boolean
}

/** Wire Pierre diff header behaviors (file links, collapse toggle). Safe to call repeatedly. */
export function mountPierreDiffHeader(
  container: HTMLElement,
  behavior: PierreDiffHeaderBehavior,
): void {
  const state = getHeaderState(container)

  if (behavior.markPatchHost) {
    container.dataset.circuitPatchDiffHost = ''
  }

  if (behavior.fileDiff && behavior.onPathClick) {
    const resolvedPath = resolveDiffFilePath(behavior.fileDiff, behavior.knownPaths)
    container.dataset.circuitDiffFilePath = resolvedPath
    state.onPathClick = behavior.onPathClick

    if (!state.fileLinkHandler) {
      const root = diffQueryRoot(container)
      const handler = (event: Event): void => {
        const target = event.target
        if (!(target instanceof Element)) return
        if (target.closest('[data-title], [data-prev-name]') == null) return

        const path = container.dataset.circuitDiffFilePath
        if (!path) return

        event.preventDefault()
        event.stopPropagation()
        state.onPathClick?.(path)
      }

      root.addEventListener('click', handler)
      state.fileLinkHandler = handler
    }
  }

  if (behavior.onToggleCollapse) {
    state.onToggleCollapse = behavior.onToggleCollapse

    if (!state.collapseHandler) {
      const header = diffHeaderElement(container)
      if (!(header instanceof HTMLElement)) return

      header.style.cursor = 'pointer'

      const handler = (event: Event): void => {
        const target = event.target
        if (!(target instanceof Element)) return
        if (isInteractiveTarget(target)) return
        state.onToggleCollapse?.()
      }

      header.addEventListener('click', handler)
      state.collapseHandler = handler
    }
  }
}

export function unmountPierreDiffHeader(container: HTMLElement): void {
  const state = headerState.get(container)
  if (!state) return

  const root = diffQueryRoot(container)

  if (state.fileLinkHandler) {
    root.removeEventListener('click', state.fileLinkHandler)
  }

  if (state.collapseHandler) {
    const header = diffHeaderElement(container)
    header?.removeEventListener('click', state.collapseHandler)
  }

  headerState.delete(container)
  delete container.dataset.circuitDiffFilePath
  delete container.dataset.circuitPatchDiffHost
}

/** Brief header highlight when navigating to a file from the changes inspector. */
export function flashDiffHeader(container: HTMLElement, dedupeKey?: string): boolean {
  const state = headerState.get(container)
  const key = dedupeKey ?? container.dataset.circuitPatchDiffHost ?? ''
  const now = Date.now()

  if (
    state &&
    key.length > 0 &&
    key === state.lastFlashKey &&
    state.lastFlashAt != null &&
    now - state.lastFlashAt < FLASH_DEDUPE_MS
  ) {
    return false
  }

  const header = diffHeaderElement(container)
  if (!header) return false

  if (key.length > 0 && state) {
    state.lastFlashKey = key
    state.lastFlashAt = now
  }

  header.classList.remove(DIFF_HEADER_FLASH_CLASS)
  void header.offsetWidth
  header.classList.add(DIFF_HEADER_FLASH_CLASS)

  const onAnimationEnd = (): void => {
    header.classList.remove(DIFF_HEADER_FLASH_CLASS)
    header.removeEventListener('animationend', onAnimationEnd)
  }

  header.addEventListener('animationend', onAnimationEnd)
  return true
}

type PierreDiffInstance = {
  fileDiff?: Pick<FileDiffMetadata, 'name' | 'prevName'>
}

export function pierreDiffViewerOptionsWithFileLinks(
  themeType: ThemeTypes,
  knownPaths: readonly string[],
  onPathClick?: (path: string) => void,
) {
  const base = pierreDiffViewerOptions(themeType)

  return {
    ...base,
    unsafeCSS: DIFF_HEADER_CSS,
    onPostRender(
      node: HTMLElement,
      instance: PierreDiffInstance,
      phase: 'mount' | 'update' | 'unmount',
    ) {
      if (phase === 'unmount') {
        if (onPathClick) unmountPierreDiffHeader(node)
        return
      }

      if (!onPathClick) return

      const fileDiff = instance.fileDiff
      if (!fileDiff) return

      mountPierreDiffHeader(node, {
        knownPaths,
        fileDiff,
        onPathClick,
      })
    },
  }
}
