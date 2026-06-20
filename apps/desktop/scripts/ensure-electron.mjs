import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const desktopRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

async function ensureElectronBinary() {
  const electronRoot = path.dirname(require.resolve('electron/package.json'))
  const distDir = path.join(electronRoot, 'dist')
  const platformPath =
    process.platform === 'darwin'
      ? 'Electron.app/Contents/MacOS/Electron'
      : process.platform === 'win32'
        ? 'electron.exe'
        : 'electron'

  const electronBinary = path.join(distDir, platformPath)

  if (existsSync(electronBinary)) {
    return
  }

  const { downloadArtifact } = require(require.resolve('@electron/get', { paths: [electronRoot] }))
  const { version } = require(path.join(electronRoot, 'package.json'))

  rmSync(distDir, { recursive: true, force: true })
  mkdirSync(distDir, { recursive: true })

  const zipPath = await downloadArtifact({
    version,
    artifactName: 'electron',
    force: true,
    checksums: require(path.join(electronRoot, 'checksums.json')),
    platform: process.platform,
    arch: process.arch,
  })

  execFileSync('unzip', ['-q', zipPath, '-d', distDir], { stdio: 'inherit' })
  writeFileSync(path.join(electronRoot, 'path.txt'), platformPath)
}

function rebuildNativeModules() {
  const rebuildBin = path.join(desktopRoot, 'node_modules', '.bin', 'electron-rebuild')
  execFileSync(rebuildBin, ['-f', '-w', 'better-sqlite3'], {
    stdio: 'inherit',
    cwd: desktopRoot,
  })
}

async function main() {
  // CI only runs lint/typecheck — no Electron binary or native modules needed.
  if (process.env.CI === 'true') {
    return
  }

  await ensureElectronBinary()
  rebuildNativeModules()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
