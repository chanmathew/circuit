import { useState } from 'react'
import { cn } from '@circuit/ui'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon } from '@hugeicons/core-free-icons'

const SECTION_LINK_CLASS =
  'shrink-0 pr-1 text-[10px] text-primary hover:underline disabled:pointer-events-none disabled:opacity-50'

const HEADER_ROW_CLASS =
  'top-0 -mx-3 mb-2.5 bg-card/95 px-3 py-1.5 pt-2 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80'

export interface ChangesCollapsibleSectionProps {
  title: string
  count?: number
  defaultOpen?: boolean
  stickyStack?: number
  action?: { label: string; disabled?: boolean; onClick: () => void }
  children: React.ReactNode
}

export function ChangesCollapsibleSection({
  title,
  count,
  defaultOpen = true,
  stickyStack = 10,
  action,
  children,
}: ChangesCollapsibleSectionProps): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="relative min-w-0">
      <div
        className={cn(
          HEADER_ROW_CLASS,
          'sticky',
          open
            ? 'z-10 shadow-[0_6px_10px_-6px] shadow-background/80'
            : 'z-0 shadow-none',
        )}
        style={{ zIndex: stickyStack }}
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1.5 px-1 py-0 text-left text-xs font-normal text-foreground/75 hover:text-foreground"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              strokeWidth={2}
              className={cn(
                'size-3 shrink-0 text-foreground/50 transition-transform',
                !open && '-rotate-90',
              )}
              aria-hidden
            />
            <span className="truncate">{title}</span>
            {count !== undefined ? (
              <span className="shrink-0 font-normal text-muted-foreground">({count})</span>
            ) : null}
          </button>
          {action ? (
            <button
              type="button"
              className={SECTION_LINK_CLASS}
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ) : null}
        </div>
      </div>
      {open ? children : null}
    </section>
  )
}
