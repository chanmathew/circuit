import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Required so `shadcn apply` / `shadcn add` detect Vite (packages/ui is a library, not an app).
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [tailwindcss()],
})
