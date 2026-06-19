import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

import { copyDbMigrationsPlugin } from './plugins/copy-db-migrations'

export default defineConfig({
  main: {
    plugins: [copyDbMigrationsPlugin()],
    build: {
      externalizeDeps: {
        exclude: ['@circuit/db', '@circuit/git', '@circuit/shared', '@circuit/workflow'],
      },
      rollupOptions: {
        external: ['better-sqlite3'],
      },
    },
  },
  preload: {},
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src'),
      },
    },
    plugins: [react(), tailwindcss()],
  },
})
