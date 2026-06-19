import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)

async function main() {
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

  const { downloadArtifact } = require('@electron/get')
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

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
