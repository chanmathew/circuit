import * as React from 'react'

import { cn } from '../lib/utils.js'

export function ScrollArea({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div className={cn('relative overflow-auto', className)} {...props}>
      {children}
    </div>
  )
}
