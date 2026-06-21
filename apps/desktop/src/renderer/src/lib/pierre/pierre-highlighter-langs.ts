import type { SupportedLanguages } from '@pierre/diffs'

/** Languages preloaded for instant highlighting in the workbench. */
export const COMMON_PIERRE_LANGS = [
  'typescript',
  'tsx',
  'javascript',
  'jsx',
  'json',
  'jsonc',
  'markdown',
  'mdx',
  'css',
  'scss',
  'html',
  'yaml',
  'toml',
  'python',
  'shell',
  'bash',
  'go',
  'rust',
  'sql',
  'dockerfile',
  'prisma',
  'graphql',
  'vue',
  'svelte',
] as const satisfies readonly SupportedLanguages[]
