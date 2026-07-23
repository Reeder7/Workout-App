import type { Exercise } from '../types'

/**
 * Read-only "how to perform" guide for an exercise: tags, safety caution,
 * coaching note, target reps, execution steps, cues, mistakes, and rationale.
 * Shared by the exercise detail page and the in-workout guide sheet.
 */
export function ExerciseGuide({ exercise }: { exercise?: Exercise }) {
  if (!exercise) return null
  const e = exercise
  const hasBody = e.notes || e.howTo || e.cues || e.mistakes || e.science

  return (
    <div>
      {e.tags && e.tags.length > 0 && (
        <div className="row wrap" style={{ gap: 6, marginBottom: 12 }}>
          {e.tags.map((t) => (
            <span key={t} className="pill pill-accent">
              {t}
            </span>
          ))}
        </div>
      )}

      {e.caution && (
        <div className="caution-banner">
          <span className="caution-icon">⚠</span>
          <span className="hint" style={{ margin: 0 }}>
            {e.caution}
          </span>
        </div>
      )}

      {hasBody && (
        <div className="card">
          {e.notes && (
            <p className="hint" style={{ margin: '0 0 4px' }}>
              {e.notes}
            </p>
          )}
          {e.repRange && (
            <div className="pill pill-accent" style={{ margin: '8px 0 4px' }}>
              Target {e.repRange[0]}–{e.repRange[1]} reps
            </div>
          )}

          {e.howTo && e.howTo.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                Execution
              </div>
              <ol className="steps">
                {e.howTo.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}

          {e.cues && e.cues.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                Key cues
              </div>
              {e.cues.map((c, i) => (
                <div className="bullet" key={i}>
                  <span className="bullet-dot accent">▸</span>
                  <span className="hint">{c}</span>
                </div>
              ))}
            </div>
          )}

          {e.mistakes && e.mistakes.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                Avoid
              </div>
              {e.mistakes.map((m, i) => (
                <div className="bullet" key={i}>
                  <span className="bullet-dot" style={{ color: 'var(--danger)' }}>
                    ✕
                  </span>
                  <span className="hint">{m}</span>
                </div>
              ))}
            </div>
          )}

          {e.science && (
            <div className="science" style={{ marginTop: 16 }}>
              <span className="eyebrow accent">Why it works</span>
              <p className="hint" style={{ margin: '6px 0 0' }}>
                {e.science}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
