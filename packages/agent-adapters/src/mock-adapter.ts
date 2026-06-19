import type { AgentActivityEvent, AgentAdapter, PhaseRunRequest, PhaseRunResult } from './types.js'

export class MockAgentAdapter implements AgentAdapter {
  readonly name = 'mock'

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
    onActivity({
      type: 'message',
      timestamp: new Date().toISOString(),
      content: `Mock run for phase "${request.phase}" on task ${request.taskId}`,
    })

    return {
      transcript: `Mock transcript for ${request.phase}`,
      filesRead: [],
      filesChanged: [],
      commandsRun: [],
      artifactContent: `# ${request.phase}\n\nMock artifact content.`,
    }
  }
}
