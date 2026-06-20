import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const mainDir = dirname(fileURLToPath(import.meta.url))
const desktopRoot = resolve(mainDir, '../..')
const repoRoot = resolve(mainDir, '../../../..')

function parseEnvLine(line: string): [string, string] | undefined {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return undefined

  const separator = trimmed.indexOf('=')
  if (separator === -1) return undefined

  const key = trimmed.slice(0, separator).trim()
  if (!key) return undefined

  let value = trimmed.slice(separator + 1).trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  return [key, value]
}

/** Load `.env` files into `process.env` without overriding existing values. */
export function loadLocalEnvFiles(): void {
  const candidates = [
    resolve(repoRoot, '.env'),
    resolve(repoRoot, '.env.local'),
    resolve(desktopRoot, '.env'),
    resolve(desktopRoot, '.env.local'),
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.env.local'),
  ]

  const seen = new Set<string>()

  for (const path of candidates) {
    if (seen.has(path) || !existsSync(path)) continue
    seen.add(path)

    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const parsed = parseEnvLine(line)
      if (!parsed) continue

      const [key, value] = parsed
      if (process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  }
}

export function describeAgentAdapterEnv(): string {
  const adapter = process.env.CIRCUIT_AGENT_ADAPTER ?? '(unset, defaults to mock)'
  const opencodeUrl = process.env.CIRCUIT_OPENCODE_URL ?? '(unset, defaults to http://localhost:4096)'
  const opencodeModel = process.env.CIRCUIT_OPENCODE_MODEL ?? '(unset, uses OpenCode server default)'
  return `CIRCUIT_AGENT_ADAPTER=${adapter}, CIRCUIT_OPENCODE_URL=${opencodeUrl}, CIRCUIT_OPENCODE_MODEL=${opencodeModel}`
}
