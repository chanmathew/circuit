import { randomUUID } from 'node:crypto'

import { getMockPhaseOutput } from './mock-fixtures.js'
import { MOCK_CAPABILITIES } from './capabilities.js'
import type { AgentAdapter } from './adapter.js'
import type { AgentActivityEvent, ChatTurnRequest, ChatTurnResult, PhaseRunRequest, PhaseRunResult } from './types.js'

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

  async runChatTurn(
    request: ChatTurnRequest,
    onActivity: (event: AgentActivityEvent) => void,
  ): Promise<ChatTurnResult> {
    const sessionId = request.sessionId ?? randomUUID()
    const timestamp = new Date().toISOString()
    let aborted = false

    request.onSessionStarted?.(sessionId, () => {
      aborted = true
    })

    onActivity({
      type: 'message',
      timestamp,
      content: `Chat session ${sessionId.slice(0, 8)} (mock)`,
      metadata: { harnessSessionId: sessionId },
    })

    onActivity({
      type: 'message',
      timestamp: new Date().toISOString(),
      content: `Mock reply to: ${request.prompt.slice(0, 120)}${request.prompt.length > 120 ? '…' : ''}`,
    })

    await delay(300)
    if (aborted) {
      throw new Error('Session aborted by user')
    }

    return {
      sessionId,
      transcript: `**User:**\n${request.prompt}\n\n**Assistant:**\n(mock) Acknowledged.`,
      modelLabel: 'mock',
    }
  }
}
