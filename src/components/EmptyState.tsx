import type { ReactNode } from 'react'

export type GlyphName = 'barbell' | 'trend' | 'plan' | 'search' | 'note'

/**
 * Line glyphs for empty states. Drawn rather than emoji: emoji render as a
 * different typeface on every platform and read as a placeholder.
 */
function Glyph({ name }: { name: GlyphName }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      {name === 'barbell' && (
        <g {...common}>
          <path d="M14 22h16" />
          <rect x="9" y="16.5" width="4.5" height="11" rx="1.6" />
          <rect x="30.5" y="16.5" width="4.5" height="11" rx="1.6" />
          <path d="M6 19.5v5M38 19.5v5" />
        </g>
      )}
      {name === 'trend' && (
        <g {...common}>
          <path d="M8 34h28" strokeDasharray="2 3.5" />
          <path d="M9 28.5l7.5-7 6 5L34 13" />
          <path d="M28.5 13H34v5.5" />
        </g>
      )}
      {name === 'plan' && (
        <g {...common}>
          <rect x="11" y="9.5" width="22" height="25" rx="3.5" />
          <path d="M17 8.5h10v3.5H17z" />
          <path d="M22 20v8M18 24h8" />
        </g>
      )}
      {name === 'search' && (
        <g {...common}>
          <circle cx="20" cy="20" r="8.5" />
          <path d="M26.5 26.5L34 34" />
        </g>
      )}
      {name === 'note' && (
        <g {...common}>
          <path d="M12 11.5h20v21H12z" />
          <path d="M17 18h10M17 23h10M17 28h6" />
        </g>
      )}
    </svg>
  )
}

interface Props {
  glyph: GlyphName
  title: string
  body?: string
  children?: ReactNode
}

export function EmptyState({ glyph, title, body, children }: Props) {
  return (
    <div className="empty">
      <div className="empty-glyph">
        <Glyph name={glyph} />
      </div>
      <p className="empty-title">{title}</p>
      {body && <p className="hint">{body}</p>}
      {children && <div className="empty-actions">{children}</div>}
    </div>
  )
}
