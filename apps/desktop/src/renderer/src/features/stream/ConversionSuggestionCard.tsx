import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@circuit/ui'

export interface ConversionSuggestionCardProps {
  onEnableWorkflow: () => void
  onEditBrief: () => void
  onDismiss: () => void
  disabled?: boolean
}

export function ConversionSuggestionCard({
  onEnableWorkflow,
  onEditBrief,
  onDismiss,
  disabled = false,
}: ConversionSuggestionCardProps): React.ReactElement {
  return (
    <Card size="sm" className="mx-auto mb-3 w-full max-w-2xl gap-2 border-primary/30 py-3 shadow-none">
      <CardHeader className="gap-1 px-4 py-0">
        <CardTitle className="text-sm">Enable workflow?</CardTitle>
        <CardDescription className="text-xs">
          This conversation looks ready for a structured workflow with phases, artifacts, and
          review.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 px-4 pb-0">
        <Button type="button" size="sm" disabled={disabled} onClick={onEnableWorkflow}>
          Enable workflow
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onEditBrief}>
          Edit brief first
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onDismiss}>
          Keep chatting
        </Button>
      </CardContent>
    </Card>
  )
}
