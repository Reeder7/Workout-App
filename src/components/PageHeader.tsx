import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

interface Props {
  title: string
  eyebrow?: string
  sub?: ReactNode
  /** Actions pinned to the right of both the inline and compact header. */
  actions?: ReactNode
  onBack?: () => void
}

/**
 * Large inline title that hands off to a compact sticky bar once it scrolls
 * away. Uses a sentinel + IntersectionObserver rather than a scroll listener
 * so it costs nothing per frame.
 */
export function PageHeader({ title, eyebrow, sub, actions, onBack }: Props) {
  const sentinel = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const el = sentinel.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting), {
      rootMargin: '-8px 0px 0px 0px',
      threshold: 0,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div className={`compact-bar${compact ? ' show' : ''}`} aria-hidden={!compact}>
        <div className="compact-inner">
          {onBack && (
            <button className="icon-btn icon-btn-bare" onClick={onBack} aria-label="Back">
              <Icon name="back" size={18} />
            </button>
          )}
          <span className="compact-title truncate">{title}</span>
          {actions && <div className="row compact-actions">{actions}</div>}
        </div>
      </div>

      <div className="page-head">
        {(onBack || actions) && (
          <div className="row-between page-head-top">
            {onBack ? (
              <button className="icon-btn" onClick={onBack} aria-label="Back">
                <Icon name="back" size={18} />
              </button>
            ) : (
              <span />
            )}
            {actions && <div className="row">{actions}</div>}
          </div>
        )}
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      <div ref={sentinel} className="head-sentinel" aria-hidden="true" />
    </>
  )
}
