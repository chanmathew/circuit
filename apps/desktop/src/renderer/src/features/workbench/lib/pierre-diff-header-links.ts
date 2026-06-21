import type { FileDiffMetadata, ThemeTypes } from '@pierre/diffs'

import { resolveDiffFilePath } from './diff-file-path.js'
import { pierreDiffViewerOptions } from '../../../lib/pierre/pierre-viewer-options.js'

const DIFF_HEADER_LINK_CSS = `
[data-title], [data-prev-name] {
  cursor: pointer;
}
[data-title]:hover bdi,
[data-prev-name]:hover bdi {
  text-decoration: underline;
}
`

const headerClickHandlers = new WeakMap<HTMLElement, (event: Event) => void>()
const headerOpenCallbacks = new WeakMap<HTMLElement, (path: string) => void>()

function diffQueryRoot(container: HTMLElement): ParentNode {
  return container.shadowRoot ?? container
}

/** Keep Pierre's default header; make filename regions open the raw file on click. */
export function wireDiffHeaderFileLinks(
  container: HTMLElement,
  fileDiff: Pick<FileDiffMetadata, 'name' | 'prevName'>,
  knownPaths: readonly string[],
  onOpenFile: (path: string) => void,
): void {
  container.dataset.circuitDiffFilePath = resolveDiffFilePath(fileDiff, knownPaths)
  headerOpenCallbacks.set(container, onOpenFile)

  if (headerClickHandlers.has(container)) return

  const root = diffQueryRoot(container)
  const handler = (event: Event): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest('[data-title], [data-prev-name]') == null) return

    const path = container.dataset.circuitDiffFilePath
    if (!path) return

    event.preventDefault()
    event.stopPropagation()
    headerOpenCallbacks.get(container)?.(path)
  }

  root.addEventListener('click', handler)
  headerClickHandlers.set(container, handler)
}

export function unwireDiffHeaderFileLinks(container: HTMLElement): void {
  const handler = headerClickHandlers.get(container)
  if (handler) {
    diffQueryRoot(container).removeEventListener('click', handler)
    headerClickHandlers.delete(container)
  }
  headerOpenCallbacks.delete(container)
  delete container.dataset.circuitDiffFilePath
}

type PierreDiffInstance = {
  fileDiff?: Pick<FileDiffMetadata, 'name' | 'prevName'>
}

export function pierreDiffViewerOptionsWithFileLinks(
  themeType: ThemeTypes,
  knownPaths: readonly string[],
  onOpenFile?: (path: string) => void,
) {
  const base = pierreDiffViewerOptions(themeType)
  if (!onOpenFile) return base

  return {
    ...base,
    unsafeCSS: DIFF_HEADER_LINK_CSS,
    onPostRender(node: HTMLElement, instance: PierreDiffInstance, phase: 'mount' | 'update' | 'unmount') {
      if (phase === 'unmount') {
        unwireDiffHeaderFileLinks(node)
        return
      }

      const fileDiff = instance.fileDiff
      if (!fileDiff) return

      wireDiffHeaderFileLinks(node, fileDiff, knownPaths, onOpenFile)
    },
  }
}
