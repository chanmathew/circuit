import { useState } from 'react'

import { Button, cn, ScrollArea, Textarea } from '@circuit/ui'

import type { FeedEventDto } from '../../../shared/api.js'

interface LocalMessage {
  id: string
  role: 'user' | 'agent'
  body: string
  timestamp: string
}

function feedEventToMessage(event: FeedEventDto, index: number): LocalMessage | null {
  const timestamp = event.timestamp
  switch (event.type) {
    case 'phase:started':
      return {
        id: `feed-${index}`,
        role: 'agent',
        body: 'Phase run started.',
        timestamp,
      }
    case 'phase:completed':
      return {
        id: `feed-${index}`,
        role: 'agent',
        body: 'Phase run completed.',
        timestamp,
      }
    case 'artifact:written': {
      const payload = event.payload as { title?: string; path?: string }
      return {
        id: `feed-${index}`,
        role: 'agent',
        body: `Wrote artifact${payload.title ? `: ${payload.title}` : ''}.`,
        timestamp,
      }
    }
    case 'decision:required': {
      const payload = event.payload as { title?: string }
      return {
        id: `feed-${index}`,
        role: 'agent',
        body: payload.title ? `Decision needed: ${payload.title}` : 'Decision needed.',
        timestamp,
      }
    }
    default:
      return null
  }
}

function ChatBubble({ message }: { message: LocalMessage }): React.ReactElement {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex flex-col gap-0.5', isUser && 'items-end')}>
      <div
        className={cn(
          'max-w-[95%] rounded-lg px-3 py-2 text-xs leading-relaxed',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
        )}
      >
        {message.body}
      </div>
      <span className="px-1 font-mono text-[9px] text-muted-foreground">
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </div>
  )
}

export interface TaskChatPanelProps {
  feedEvents: FeedEventDto[]
}

export function TaskChatPanel({ feedEvents }: TaskChatPanelProps): React.ReactElement {
  const [draft, setDraft] = useState('')
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([])

  const feedMessages = feedEvents
    .map((event, index) => feedEventToMessage(event, index))
    .filter((message): message is LocalMessage => message !== null)

  const messages = [...feedMessages, ...localMessages]

  const send = (): void => {
    const body = draft.trim()
    if (!body) return
    setLocalMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        role: 'user',
        body,
        timestamp: new Date().toISOString(),
      },
    ])
    setDraft('')
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card/30">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Chat
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-3">
          {messages.length === 0 ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Steer the agent, ask questions, or request changes. Messages are local for now —
              workflow steering arrives with OpenCode.
            </p>
          ) : (
            messages.map((message) => <ChatBubble key={message.id} message={message} />)
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border p-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message the agent…"
          className="min-h-16 resize-none bg-background text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <div className="mt-2 flex justify-end">
          <Button type="button" size="sm" disabled={!draft.trim()} onClick={send}>
            Send
          </Button>
        </div>
      </div>
    </aside>
  )
}
