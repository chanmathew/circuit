import type { ActivityGroupRow } from './stream-items.js'

export const EDIT_FILE_LABEL = /^(Edited|Editing|Changed|Writing|Patching)\s+(.+)$/i
export const READ_FILE_LABEL = /^(Reading|Read)\s+(.+)$/i

export function stripDiffStatsFromPath(filePath: string): string {
  return filePath.replace(/\s+[+-]\d+(?:\s+[+-]\d+)?$/, '').trim()
}

export function parseFileTargetFromLabel(label: string): {
  filePath?: string
  openAs?: 'file' | 'diff'
} {
  const editMatch = label.match(EDIT_FILE_LABEL)
  if (editMatch) {
    return { filePath: stripDiffStatsFromPath(editMatch[2].trim()), openAs: 'diff' }
  }

  const readMatch = label.match(READ_FILE_LABEL)
  if (readMatch) {
    return { filePath: stripDiffStatsFromPath(readMatch[2].trim()), openAs: 'file' }
  }

  return {}
}

export function inferOpenAsFromLabel(label: string): 'file' | 'diff' | undefined {
  if (EDIT_FILE_LABEL.test(label)) return 'diff'
  if (READ_FILE_LABEL.test(label)) return 'file'
  return undefined
}

/** Resolve click target for an activity row — prefers structured fields, falls back to label parse. */
export function resolveActivityRowFileTarget(
  entry: Pick<ActivityGroupRow, 'label' | 'filePath' | 'openAs' | 'additions' | 'deletions'>,
): {
  filePath?: string
  openAs?: 'file' | 'diff'
} {
  let filePath = entry.filePath?.trim()
  let openAs = entry.openAs

  if (!openAs && filePath) {
    openAs = inferOpenAsFromLabel(entry.label)
  }

  if (!openAs && (entry.additions != null || entry.deletions != null)) {
    openAs = 'diff'
  }

  if (filePath && openAs) {
    return { filePath: stripDiffStatsFromPath(filePath), openAs }
  }

  return parseFileTargetFromLabel(entry.label)
}

export type ActivityRowLabelParts = {
  prefix: string
  fileName?: string
  filePath?: string
  openAs?: 'file' | 'diff'
}

/** Split a tool row into plain verb text and a clickable filename. */
export function activityRowLabelParts(
  entry: Pick<ActivityGroupRow, 'label' | 'filePath' | 'openAs' | 'additions' | 'deletions'>,
): ActivityRowLabelParts {
  const target = resolveActivityRowFileTarget(entry)
  if (!target.filePath) {
    return { prefix: entry.label }
  }

  const filePath = target.filePath
  const fileName = filePath.split('/').pop() ?? filePath

  const editMatch = entry.label.match(EDIT_FILE_LABEL)
  if (editMatch) {
    return { prefix: `${editMatch[1]} `, fileName, filePath, openAs: target.openAs }
  }

  const readMatch = entry.label.match(READ_FILE_LABEL)
  if (readMatch) {
    return { prefix: `${readMatch[1]} `, fileName, filePath, openAs: target.openAs }
  }

  return { prefix: entry.label, fileName, filePath, openAs: target.openAs }
}
