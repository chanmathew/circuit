export const taskChevronClassName =
  'size-2.5 shrink-0 text-muted-foreground/70 transition-transform [[data-state=closed]_&]:-rotate-90'

export const SEVERITY_BORDER: Record<'info' | 'warning' | 'blocked' | 'no_ship', string> = {
  info: 'border-border',
  warning: 'border-amber-500/40',
  blocked: 'border-destructive/50',
  no_ship: 'border-destructive',
}

export const messageActionsClassName =
  'w-full justify-start opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'

export const mutedUserMessageClassName = 'group-[.is-user]:text-muted-foreground'
export const mutedAssistantMessageClassName = 'group-[.is-assistant]:text-muted-foreground'
export const mutedTaskTitleClassName = 'text-muted-foreground'
