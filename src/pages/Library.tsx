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
    body: 'Most hard sets should end 0–3 reps shy of failure (RIR). Push isolations and machines to (or near) failure — the fatigue cost is low. Keep heavy compounds like squats and deadlifts with a bit more in reserve (~1–3 RIR) to manage fatigue and stay technically safe. A common pattern: 1–2 RIR on the early sets, last set to failure.',
  },
  {
    title: 'Volume: ~10–20 sets / muscle / week',
    body: 'Total hard sets per muscle per week is your main volume dial. Start around 10, add sets over a training block if you’re recovering and progressing well, and pull back if progress stalls or recovery suffers. Volume is a dose you titrate, not a fixed number.',
  },
  {
    title: 'Frequency ~2× / week',
    body: 'Hitting each muscle about twice a week lets you spread quality volume across sessions with less per-session fatigue and a fresher growth stimulus than a once-a-week bro split. Higher-frequency plans (4–5×) can work for advanced lifters who recover well.',
  },
  {
    title: 'Progressive overload (double progression)',
    body: 'Beat your logbook over time. Work within the target rep range; once you hit the top of the range across all sets, add a small amount of weight and drop back to the bottom of the range. Small, steady increases win. Beginners can just add a little weight each week.',
  },
  {
    title: 'Rep range 5–30',
    body: 'Growth happens across a wide rep range when sets are taken close to failure — 6–12 isn’t uniquely magical. Anchor big compounds in ~5–10 reps, most work in ~8–15, and isolations in ~12–20+. Use ~1–5 reps when the goal is pure strength.',
  },
  {
    title: 'Exercise selection',
    body: 'Favor movements with a good stability–range of motion–resistance profile, and make sure at least one exercise per muscle loads it hard in the stretched (lengthened) position — that’s where much of the growth stimulus comes from.',
  },
  {
    title: 'Lengthened partials & the stretch',
    body: 'The stretched portion of a rep is the most productive. Never skip the deep stretch on any lift. For a modest extra edge, you can add partial reps in the stretched position after reaching failure — it works best on stretch-loaded moves like RDLs, rows, flyes, pullovers, and overhead triceps. Use it selectively; it adds fatigue.',
  },
  {
    title: 'Rest & recovery',
    body: 'Rest ~2–3+ minutes on heavy compounds to preserve force and total volume, and ~1–2 minutes on isolation work. Take a lighter deload (~50–70% of normal volume/intensity) roughly every 4–8 weeks to shed accumulated fatigue.',
  },
  {
    title: 'Training around joint or tendon pain',
    body: 'You don’t need to be pain-free to train — loading with some pain is safe if you keep it controlled. Use the traffic-light rule: pain ≤3/10 during the set and back to baseline by next morning = green, keep progressing. Pain 3–5/10 that settles = amber, hold steady. Pain >5/10, or worse the next morning = red, back off load, depth, or range (or switch to isometrics). Adapt by changing the movement — tempo, foot position, range — not by skipping. Judge the weekly trend, not single sessions. (Educational, not medical advice — clear injuries with your PT/surgeon.)',
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
              <Icon name="chart" size={16} /> Full details & progress
            </button>
          </>
        )}
      </Sheet>
    </div>
  )
}
