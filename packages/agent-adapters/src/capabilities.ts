/** How a harness returns completed run transcripts. */
export type TranscriptExportMode = 'inline' | 'ref' | 'none'

/** Capability flags — adapters declare what the harness supports. */
export interface AgentAdapterCapabilities {
  /** Harness accepts user messages during an active run. */
  midRunMessaging: boolean
  /** Harness emits live activity callbacks during runPhase. */
  liveStreaming: boolean
  /** Harness can fetch historical session messages for stream rebuild. */
  sessionFetch: boolean
  /** How completed run transcripts are returned. */
  transcriptExport: TranscriptExportMode
  /** Harness creates and owns external session identifiers. */
  ownsSessionId: boolean
}

/** File-protocol / manual harness — no programmatic session API. */
export const LEVEL_0_CAPABILITIES: AgentAdapterCapabilities = {
  midRunMessaging: false,
  liveStreaming: false,
  sessionFetch: false,
  transcriptExport: 'none',
  ownsSessionId: false,
}

export const MOCK_CAPABILITIES: AgentAdapterCapabilities = {
  midRunMessaging: false,
  liveStreaming: true,
  sessionFetch: false,
  transcriptExport: 'inline',
  ownsSessionId: true,
}

export const OPENCODE_CAPABILITIES: AgentAdapterCapabilities = {
  midRunMessaging: true,
  liveStreaming: true,
  sessionFetch: true,
  transcriptExport: 'inline',
  ownsSessionId: true,
}

/** Codex-style local JSONL sessions — fetch + ref export, limited live streaming. */
export const CODEX_CAPABILITIES: AgentAdapterCapabilities = {
  midRunMessaging: true,
  liveStreaming: false,
  sessionFetch: true,
  transcriptExport: 'ref',
  ownsSessionId: true,
}
