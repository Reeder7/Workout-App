import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  /** 'auto' hugs content; 'medium' opens near half height; 'large' near full. */
  detent?: 'auto' | 'medium' | 'large'
  children: ReactNode
}

/** Past this many pixels of downward drag, releasing dismisses the sheet. */
const DISMISS_PX = 96
/** Or a fast enough downward flick, regardless of distance. */
const DISMISS_VELOCITY = 0.55

export function Sheet({ open, onClose, title, detent = 'auto', children }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; startT: number; y: number } | null>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  // Reset any leftover drag when the sheet is reopened.
  useEffect(() => {
    if (open) setOffset(0)
  }, [open])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only the grabber area starts a drag, so content stays scrollable.
    drag.current = { startY: e.clientY, startT: e.timeStamp, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current) return
    drag.current.y = e.clientY
    setOffset(Math.max(0, e.clientY - drag.current.startY))
  }, [])

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current
      drag.current = null
      if (!d) return
      const dist = Math.max(0, d.y - d.startY)
      const dt = Math.max(1, e.timeStamp - d.startT)
      if (dist > DISMISS_PX || dist / dt > DISMISS_VELOCITY) onClose()
      else setOffset(0)
    },
    [onClose],
  )

  if (!open) return null

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={panel}
        className={`sheet detent-${detent}`}
        onClick={(e) => e.stopPropagation()}
        style={
          offset
            ? { transform: `translateY(${offset}px)`, transition: 'none', animation: 'none' }
            : undefined
        }
      >
        <div
          className="sheet-grabber"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="sheet-handle" />
        </div>
        {title && <h2 className="sheet-title">{title}</h2>}
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}
