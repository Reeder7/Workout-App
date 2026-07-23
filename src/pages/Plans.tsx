import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { TEMPLATES } from '../data/templates'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'

export function Plans() {
  const nav = useNavigate()
  const plans = useStore((s) => s.plans)
  const addFromTemplate = useStore((s) => s.addPlanFromTemplate)
  const createEmpty = useStore((s) => s.createEmptyPlan)
  const duplicate = useStore((s) => s.duplicatePlan)
  const [templatesOpen, setTemplatesOpen] = useState(false)

  return (
    <div className="app">
      <div className="eyebrow">Programming</div>
      <h1 className="page-title">Plans</h1>
      <p className="page-sub">
        Build training splits the evidence-based way — 2× weekly frequency, smart volume, and
        rep targets baked in.
      </p>

      <div className="row" style={{ gap: 10, marginBottom: 4 }}>
        <button
          className="btn btn-primary grow"
          onClick={() => {
            const p = createEmpty()
            nav(`/plans/${p.id}`)
          }}
        >
          <Icon name="plus" size={18} /> New plan
        </button>
        <button className="btn grow" onClick={() => setTemplatesOpen(true)}>
          <Icon name="clipboard" size={18} /> Templates
        </button>
      </div>

      <div className="section-head">
        <h2>Your plans</h2>
      </div>

      {plans.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">📋</div>
          <p>No plans yet.</p>
          <p className="hint">
            Start from a proven template (Full Body, Upper/Lower, or Push/Pull/Legs) or build
            your own.
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 8 }}
            onClick={() => setTemplatesOpen(true)}
          >
            Browse templates
          </button>
        </div>
      ) : (
        plans.map((p) => (
          <div className="card" key={p.id}>
            <div className="row-between">
              <button
                className="grow"
                style={{ textAlign: 'left', background: 'none' }}
                onClick={() => nav(`/plans/${p.id}`)}
              >
                <div style={{ fontWeight: 700, fontSize: 17 }}>{p.name}</div>
                <div className="faint" style={{ fontSize: 13 }}>
                  {p.days.length} day{p.days.length === 1 ? '' : 's'} · {p.daysPerWeek}×/week ·{' '}
                  {p.days.reduce((t, d) => t + d.exercises.length, 0)} exercises
                </div>
              </button>
              <button
                className="icon-btn"
                onClick={() => duplicate(p.id)}
                aria-label="Duplicate plan"
              >
                <Icon name="copy" size={16} />
              </button>
              <button
                className="icon-btn"
                onClick={() => nav(`/plans/${p.id}`)}
                aria-label="Edit plan"
              >
                <Icon name="edit" size={16} />
              </button>
            </div>
            {p.description && (
              <p className="hint" style={{ marginBottom: 0, marginTop: 10 }}>
                {p.description}
              </p>
            )}
          </div>
        ))
      )}

      <Sheet
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        title="Start from a template"
      >
        <p className="hint" style={{ marginTop: 0 }}>
          Evidence-based splits inspired by Jeff Nippard's programming. Adding one copies it into
          your plans so you can customize freely.
        </p>
        {TEMPLATES.map((t) => (
          <div className="card" key={t.id}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{t.name}</div>
            <div className="faint" style={{ fontSize: 12, marginBottom: 6 }}>
              {t.daysPerWeek}×/week · {t.days.length} sessions
            </div>
            <p className="hint" style={{ marginTop: 0 }}>
              {t.description}
            </p>
            <button
              className="btn btn-primary btn-block btn-sm"
              onClick={() => {
                const p = addFromTemplate(t.id)
                setTemplatesOpen(false)
                if (p) nav(`/plans/${p.id}`)
              }}
            >
              <Icon name="plus" size={14} /> Add to my plans
            </button>
          </div>
        ))}
      </Sheet>
    </div>
  )
}
