import { DEFAULT_THEMES, type ThemeTypes } from '@pierre/diffs'

export function pierreFileViewerOptions(themeType: ThemeTypes) {
  return {
    themeType,
    theme: DEFAULT_THEMES,
    disableFileHeader: true,
    overflow: 'wrap' as const,
  }
}

export function pierreDiffViewerOptions(themeType: ThemeTypes) {
  return {
    themeType,
    theme: DEFAULT_THEMES,
    diffStyle: 'unified' as const,
    overflow: 'wrap' as const,
    stickyHeader: true,
  }
}
