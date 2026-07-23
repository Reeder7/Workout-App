import { useEffect, useState } from 'react'
import { Icon } from './Icon'

interface Props {
  endsAt: number
  onExtend: (sec: number) => void
  onDismiss: () => void
}

export function RestTimer({ endsAt, onExtend, onDismiss }: Props) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  const remaining = Math.max(0, Math.round((endsAt - now) / 1000))
  const mm = Math.floor(remaining / 60)
  const ss = remaining % 60
  const done = remaining === 0

  useEffect(() => {
    if (done && navigator.vibrate) navigator.vibrate([120, 60, 120])
  }, [done])

  return (
    <div className="timer-bar">
      <div className="timer-inner">
        <Icon name="timer" size={20} className="accent" />
        <div className="grow">
          <div className="timer-time">
            {done ? "Rest done" : `${mm}:${ss.toString().padStart(2, '0')}`}
          </div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={() => onExtend(-15)}>
          −15
        </button>
        <button className="btn btn-sm btn-ghost" onClick={() => onExtend(15)}>
          +15
        </button>
        <button className="icon-btn" onClick={onDismiss} aria-label="Dismiss timer">
          <Icon name="x" size={16} />
        </button>
      </div>
    </div>
  )
}
