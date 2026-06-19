/// <reference types="vite-plus/client" />

export interface CircuitApi {
  ping: () => Promise<string>
}

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
