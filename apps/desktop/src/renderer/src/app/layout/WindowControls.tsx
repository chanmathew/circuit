import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, Copy01Icon, MinusSignIcon, SquareIcon } from '@hugeicons/core-free-icons'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@circuit/ui'

import { circuitApi } from '../../ipc/client.js'
import { CHROME_CONTROL_CLASS, CHROME_NO_DRAG_STYLE } from './chrome-row.js'

export function WindowControls(): React.ReactElement {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    void circuitApi.getWindowState().then((state) => {
      setIsMaximized(state.isMaximized)
    })
  }, [])

  const handleMinimize = useCallback(() => {
    void circuitApi.windowMinimize()
  }, [])

  const handleToggleMaximize = useCallback(() => {
    void circuitApi.windowToggleMaximize().then(() => {
      void circuitApi.getWindowState().then((state) => {
        setIsMaximized(state.isMaximized)
      })
    })
  }, [])

  const handleClose = useCallback(() => {
    void circuitApi.windowClose()
  }, [])

  const buttonClass = `${CHROME_CONTROL_CLASS} !w-10 min-w-10 rounded-none px-0`

  return (
    <div className="flex shrink-0 items-center" style={CHROME_NO_DRAG_STYLE}>
      <Button
        variant="ghost"
        size="icon-sm"
        className={buttonClass}
        onClick={handleMinimize}
        aria-label="Minimize"
      >
        <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={buttonClass}
        onClick={handleToggleMaximize}
        aria-label={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? (
          <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-3" />
        ) : (
          <HugeiconsIcon icon={SquareIcon} strokeWidth={2} className="size-3" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={`${buttonClass} hover:bg-destructive/90 hover:text-destructive-foreground`}
        onClick={handleClose}
        aria-label="Close"
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
      </Button>
    </div>
  )
}

export function toggleMaximizeOnDoubleClick(): void {
  void circuitApi.windowToggleMaximize()
}
