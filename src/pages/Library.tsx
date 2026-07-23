import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { MUSCLE_GROUPS } from '../data/exercises'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import type { Exercise, MuscleGroup } from '../types'

const PRINCIPLES = [
  {
    title: 'Train close to failure',
    body: 'Most hard sets should end 0–3 reps shy of failure (RIR). That’s the effort level that reliably drives growth without burying your recovery.',
  },
  {
    title: 'Progressive overload',
    body: 'Beat your logbook over time — add reps within the target range, then add weight and reset to the bottom of the range. Small, steady increases win.',
  },
  {
    title: 'Volume: ~10–20 sets / muscle / week',
    body: 'Total hard sets per muscle per week is the main volume dial. Start around 10, add sets over a block if you’re recovering well.',
  },
  {
    title: 'Frequency 2× / week',
    body: 'Hitting each muscle about twice a week lets you spread volume out and refresh the growth stimulus more often than a once-a-week bro split.',
  },
  {
    title: 'Rep range 5–30',
    body: 'Growth happens across a wide rep range when sets are taken close to failure. Anchor compounds in the 5–10 range and isolations in the 10–20 range.',
  },
  {
    title: 'Exercise selection',
    body: 'Favor movements with a good stability–ROM–resistance profile, and include at least one that loads the muscle in a stretched position.',
  },
]

export function Library() {
  const nav = useNavigate()
  const all = useStore((s) => s.allExercises())
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | 'All'>('All')
  const [selected, setSelected] = useState<Exercise | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all
      .filter((e) => (muscle === 'All' ? true : e.primary === muscle))
      .filter((e) => (q ? e.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [all, query, muscle])

  return (
    <div className="app">
      <div className="row-between">
        <div>
          <div className="eyebrow">Knowledge</div>
          <h1 className="page-title">Library</h1>
        </div>
        <button className="icon-btn" onClick={() => nav('/settings')} aria-label="Settings">
          <Icon name="settings" size={18} />
        </button>
      </div>
      <p className="page-sub">
        {all.length} exercises with evidence-based selection notes, plus core training
        principles.
      </p>

      <input
        placeholder="Search exercises…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 10 }}
      />
      <div className="chips">
        <button
          className={`chip${muscle === 'All' ? ' active' : ''}`}
          onClick={() => setMuscle('All')}
        >
          All
        </button>
        {MUSCLE_GROUPS.map((m) => (
          <button
            key={m}
            className={`chip${muscle === m ? ' active' : ''}`}
            onClick={() => setMuscle(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 6 }}>
        {filtered.map((e) => (
          <button
            key={e.id}
            className="lrow"
            style={{ width: '100%', textAlign: 'left', background: 'none' }}
            onClick={() => setSelected(e)}
          >
            <div className="grow">
              <div style={{ fontWeight: 600 }}>
                {e.name}
                {e.custom && <span className="tag"> · custom</span>}
              </div>
              <div className="faint" style={{ fontSize: 12 }}>
                {e.primary} · {e.equipment} · {e.category}
              </div>
            </div>
            <Icon name="chevron" className="faint" size={18} />
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="faint center" style={{ padding: '16px 0' }}>
            No matches.
          </p>
        )}
      </div>

      <div className="section-head">
        <h2>Training principles</h2>
      </div>
      {PRINCIPLES.map((p) => (
        <div className="card" key={p.title}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
          <p className="hint" style={{ margin: 0 }}>
            {p.body}
          </p>
        </div>
      ))}
      <p className="faint" style={{ fontSize: 11, marginTop: 16, textAlign: 'center' }}>
        Training principles and exercise notes are inspired by Jeff Nippard's evidence-based
        content. This app is an independent personal project and isn't affiliated with or
        endorsed by him.
      </p>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <>
            <div className="row wrap" style={{ gap: 6, marginBottom: 12 }}>
              <span className="pill">{selected.primary}</span>
              {selected.secondary.map((s) => (
                <span className="pill" key={s}>
                  {s}
                </span>
              ))}
              <span className="pill">{selected.equipment}</span>
              <span className="pill">{selected.category}</span>
            </div>
            {selected.repRange && (
              <div className="pill pill-accent" style={{ marginBottom: 12 }}>
                Target {selected.repRange[0]}–{selected.repRange[1]} reps
              </div>
            )}
            {selected.notes && (
              <p className="hint" style={{ marginTop: 0 }}>
                {selected.notes}
              </p>
            )}
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 8 }}
              onClick={() => {
                const id = selected.id
                setSelected(null)
                nav(`/progress/${id}`)
              }}
            >
              <Icon name="chart" size={16} /> View my progress
            </button>
          </>
        )}
      </Sheet>
    </div>
  )
}
