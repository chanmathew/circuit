import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'electron-vite'

import { copyDbMigrationsPlugin } from './plugins/copy-db-migrations'

const repoRoot = resolve(__dirname, '../..')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, ['CIRCUIT_', 'MAIN_VITE_', 'VITE_'])
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }

  return {
  main: {
    envDir: repoRoot,
    envPrefix: ['CIRCUIT_', 'MAIN_VITE_'],
    plugins: [copyDbMigrationsPlugin()],
    build: {
      externalizeDeps: {
        exclude: [
          '@circuit/agent-adapters',
          '@circuit/db',
          '@circuit/git',
          '@circuit/protocol',
          '@circuit/shared',
          '@circuit/workflow',
        ],
      },
      rollupOptions: {
        external: ['better-sqlite3'],
      },
    },
  },
  preload: {},
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react(), tailwindcss()],
  },
  }
})
