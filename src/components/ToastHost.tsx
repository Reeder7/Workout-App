import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { onToast, type ToastMessage } from '../lib/toast'

const DURATION = 2600

/**
 * Single-slot toast. A stack would fight the tab bar for the same 56px, and
 * these are confirmations, not a log — the newest message replaces the old.
 */
export function ToastHost() {
  const [current, setCurrent] = useState<ToastMessage | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(
    () =>
      onToast((msg) => {
        setCurrent(msg)
        if (timer.current) window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setCurrent(null), DURATION)
      }),
    [],
  )

  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), [])

  if (!current) return null

  return (
    <div className="toast-host" role="status" aria-live="polite">
      <div className={`toast tone-${current.tone}`} key={current.id}>
        {current.tone !== 'neutral' && (
          <Icon name={current.tone === 'success' ? 'check' : 'info'} size={15} />
        )}
        <span>{current.text}</span>
      </div>
    </div>
  )
}
