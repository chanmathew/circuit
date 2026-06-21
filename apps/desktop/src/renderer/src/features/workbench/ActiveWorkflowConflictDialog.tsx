import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@circuit/ui'

export interface ActiveWorkflowConflictDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: () => void
  onCancelAndStart: () => void
  pending?: boolean
  startLabel?: string
}

export function ActiveWorkflowConflictDialog({
  open,
  onOpenChange,
  onContinue,
  onCancelAndStart,
  pending = false,
  startLabel = 'Cancel current and start new',
}: ActiveWorkflowConflictDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Workflow already active</DialogTitle>
          <DialogDescription>
            This task already has an active workflow. Continue the current run, or cancel it and
            start a new one.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={pending} onClick={onContinue}>
            Continue current
          </Button>
          <Button type="button" disabled={pending} onClick={onCancelAndStart}>
            {startLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
