import { randomUUID } from 'node:crypto'

import { getMockPhaseOutput } from './mock-fixtures.js'
import { MOCK_CAPABILITIES } from './capabilities.js'
import type { AgentAdapter } from './adapter.js'
import type { AgentActivityEvent, PhaseRunRequest, PhaseRunResult } from './types.js'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class MockAgentAdapter implements AgentAdapter {
  readonly name = 'mock'
  readonly capabilities = MOCK_CAPABILITIES

  async connect(): Promise<void> {
    // no-op
  }

  async disconnect(): Promise<void> {
    // no-op
  }

  async runPhase(
    request: PhaseRunRequest,
    onActivity: (event: AgentActivityEvent) => void,
  ): Promise<PhaseRunResult> {
    const output = getMockPhaseOutput(request.phase)
    const timestamp = new Date().toISOString()
    const sessionId = request.sessionId || randomUUID()

    onActivity({
      type: 'message',
      timestamp,
      content: `Session ${sessionId.slice(0, 8)} · context ${request.contextPack.hash.slice(0, 8)} (${request.contextPack.files.length} files)`,
    })

    onActivity({
      type: 'message',
      timestamp,
      content: `Running ${request.phase} phase (mock adapter)…`,
    })

    await delay(300)

    for (const path of output.filesRead) {
      onActivity({
        type: 'file_read',
        timestamp: new Date().toISOString(),
        content: path,
      })
      await delay(100)
    }

    onActivity({
      type: 'message',
      timestamp: new Date().toISOString(),
      content: `${request.phase} phase complete — artifact ready for review.`,
    })

    return {
      sessionId,
      contextPackHash: request.contextPack.hash,
      transcript: output.transcript,
      filesRead: output.filesRead,
      filesChanged: [],
      commandsRun: [],
      artifactContent: output.artifactContent,
      modelLabel: 'mock',
    }
  }
}
