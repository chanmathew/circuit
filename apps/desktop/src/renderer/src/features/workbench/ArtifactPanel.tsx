import { Button, Separator, Textarea, cn } from '@circuit/ui'

export interface ArtifactPanelProps {
  title: string
  relativePath: string
  content: string
  preview: boolean
  onPreviewChange: (preview: boolean) => void
}

export function ArtifactPanel({
  title,
  relativePath,
  content,
  preview,
  onPreviewChange,
}: ArtifactPanelProps): React.ReactElement {
  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="truncate font-mono text-[10px] text-muted-foreground">{relativePath}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant={preview ? 'ghost' : 'secondary'}
            size="sm"
            type="button"
            onClick={() => onPreviewChange(false)}
          >
            Source
          </Button>
          <Button
            variant={preview ? 'secondary' : 'ghost'}
            size="sm"
            type="button"
            onClick={() => onPreviewChange(true)}
          >
            Preview
          </Button>
        </div>
      </div>
      {preview ? (
        <article className="overflow-auto p-6 text-sm leading-relaxed">
          <MarkdownPreview content={content} />
        </article>
      ) : (
        <Textarea
          className="min-h-[480px] resize-none rounded-none border-0 bg-transparent font-mono text-sm focus-visible:ring-0"
          value={content}
          readOnly
        />
      )}
    </div>
  )
}

function MarkdownPreview({ content }: { content: string }): React.ReactElement {
  const lines = content.split('\n')
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith('# '))
          return (
            <h1 key={i} className="mb-3 mt-0 text-xl font-bold">
              {line.slice(2)}
            </h1>
          )
        if (line.startsWith('## '))
          return (
            <h2 key={i} className="mb-2 mt-4 text-base font-semibold">
              {line.slice(3)}
            </h2>
          )
        if (line.startsWith('### '))
          return (
            <h3 key={i} className="mb-1 mt-3 text-sm font-semibold">
              {line.slice(4)}
            </h3>
          )
        if (line.startsWith('- '))
          return (
            <li key={i} className="ml-4 list-disc">
              {renderInline(line.slice(2))}
            </li>
          )
        if (line.startsWith('|'))
          return (
            <pre key={i} className="overflow-x-auto text-xs">
              {line}
            </pre>
          )
        if (line.startsWith('```')) return null
        if (line.trim() === '') return <br key={i} />
        if (line.startsWith('---')) return <Separator key={i} className="my-4" />
        return <p key={i}>{renderInline(line)}</p>
      })}
    </div>
  )
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g)
  return parts.map((part, i) =>
    part.startsWith('`') && part.endsWith('`') ? (
      <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  )
}
