/// <reference types="vite-plus/client" />

import type { CircuitApi } from '../../shared/api.js'

declare global {
  interface Window {
    circuit: CircuitApi
  }
}

declare module '*.css' {
  const content: string
  export default content
}

declare module '@circuit/ui/styles.css' {
  const content: string
  export default content
}
