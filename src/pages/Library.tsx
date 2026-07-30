import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { MUSCLE_GROUPS } from '../data/exercises'
import { LANDMARKS, DEFAULTS } from '../data/landmarks'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { PageHeader } from '../components/PageHeader'
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
    title: 'Effective reps, not time under tension',
    body: 'Tempo barely matters on its own — anywhere from about 0.5 to 8 seconds per rep grows muscle similarly. What drives growth is effective reps: the final reps near failure under high tension. A long slow set stopped well short of failure beats nothing, but it loses to a shorter set taken close to failure. Use a controlled 2–3 second eccentric; don’t treat super-slow reps as a hack.',
  },
  {
    title: 'Training around joint or tendon pain',
    body: 'You don’t need to be pain-free to train — loading with some pain is safe if you keep it controlled. Use the traffic-light rule: pain ≤3/10 during the set and back to baseline by next morning = green, keep progressing. Pain 3–5/10 that settles = amber, hold steady. Pain >5/10, or worse the next morning = red, back off load, depth, or range (or switch to isometrics). Adapt by changing the movement — tempo, foot position, range — not by skipping. Judge the weekly trend, not single sessions. (Educational, not medical advice — clear injuries with your PT/surgeon.)',
  },
  {
    title: 'Don’t over-optimize the small stuff',
    body: 'Most of the differences the research finds between load, tempo, rest, frequency and exact failure proximity are small. Adherence, honest effort, and progressive overload dwarf all of them. Get those three right and the rest is fine-tuning — the numbers in this app are sensible defaults, not magic.',
  },
]

/** Claims the evidence does not support. */
const MYTHS = [
  'Soreness (DOMS) means it was a good workout — it isn’t a growth signal.',
  'There’s one magic “hypertrophy rep zone” (8–12 only).',
  'You need a pump for growth.',
  '“Muscle confusion” — constantly changing exercises to keep muscles guessing.',
  'Super-slow reps are a growth hack.',
  'Supramaximal (heavier-than-1RM) eccentrics accelerate size gains.',
  'You must train every set to failure.',
  'Frequency itself drives growth once weekly volume is equal.',
  'Light weights “tone” while heavy weights “bulk”.',
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
      <PageHeader
        eyebrow="Knowledge"
        title="Library"
        sub={`${all.length} exercises with evidence-based selection notes, plus core training principles.`}
        actions={
          <button className="icon-btn" onClick={() => nav('/settings')} aria-label="Settings">
            <Icon name="settings" size={18} />
          </button>
        }
      />

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
          <div style={{ fontWeight: 640, marginBottom: 4 }}>{p.title}</div>
          <p className="hint" style={{ margin: 0 }}>
            {p.body}
          </p>
        </div>
      ))}

      <div className="section-head">
        <h2>Weekly volume landmarks</h2>
        <span className="tag">sets / muscle / week</span>
      </div>
      <div className="card">
        <p className="hint" style={{ marginTop: 0 }}>
          Starting points for an intermediate lifter, on the fractional scale this app counts with
          (a muscle worked as a secondary counts as half a set). <strong>MEV</strong> = minimum
          effective, <strong>MAV</strong> = the productive zone, <strong>MRV</strong> = maximum
          recoverable. Start near MEV, ramp about {DEFAULTS.weeklySetRamp} set per week, and
          deload around week {DEFAULTS.mesocycleWeeks}.
        </p>
        <div className="tablewrap">
          <table className="dtable">
            <thead>
              <tr>
                <th>Muscle</th>
                <th>MEV</th>
                <th>MAV</th>
                <th>MRV</th>
              </tr>
            </thead>
            <tbody>
              {MUSCLE_GROUPS.map((m) => {
                const l = LANDMARKS[m]
                if (!l) return null
                return (
                  <tr key={m}>
                    <td>{m}</td>
                    <td className="mono">{l.mev[0]}</td>
                    <td className="mono">
                      {l.mav[0]}–{l.mav[1]}
                    </td>
                    <td className="mono">{l.mrv}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ marginBottom: 0, marginTop: 12 }}>
          These are heuristics calibrated from published frameworks, not measured constants — your
          own recovery and performance are the real test.
        </p>
      </div>

      <div className="section-head">
        <h2>Default prescriptions</h2>
      </div>
      <div className="card">
        <div className="tablewrap">
          <table className="dtable">
            <tbody>
              <tr>
                <td>Compound reps / RIR / rest</td>
                <td className="mono nowrap">
                  {DEFAULTS.compoundReps[0]}–{DEFAULTS.compoundReps[1]} ·{' '}
                  {DEFAULTS.compoundRir[0]}–{DEFAULTS.compoundRir[1]} ·{' '}
                  {DEFAULTS.compoundRestSec}s
                </td>
              </tr>
              <tr>
                <td>Isolation reps / RIR / rest</td>
                <td className="mono nowrap">
                  {DEFAULTS.isolationReps[0]}–{DEFAULTS.isolationReps[1]} ·{' '}
                  {DEFAULTS.isolationRirLastSet[0]}–{DEFAULTS.isolationRirLastSet[1]} ·{' '}
                  {DEFAULTS.isolationRestSec}s
                </td>
              </tr>
              <tr>
                <td>Frequency per muscle</td>
                <td className="mono nowrap">{DEFAULTS.frequencyPerMuscle}×/week</td>
              </tr>
              <tr>
                <td>Sets per muscle per session (cap)</td>
                <td className="mono nowrap">{DEFAULTS.setsPerMuscleSessionCap}</td>
              </tr>
              <tr>
                <td>Default tempo</td>
                <td className="mono nowrap">{DEFAULTS.defaultTempo}</td>
              </tr>
              <tr>
                <td>Stretch-biased isolation tempo</td>
                <td className="mono nowrap">{DEFAULTS.stretchIsolationTempo}</td>
              </tr>
              <tr>
                <td>Protein</td>
                <td className="mono nowrap">
                  {DEFAULTS.proteinGPerKg}–{DEFAULTS.proteinGPerKgDeficit} g/kg
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ marginBottom: 0, marginTop: 12 }}>
          Tempo is written eccentric–pause–concentric–pause in seconds.
        </p>
      </div>

      <div className="section-head">
        <h2>Myths the research doesn’t support</h2>
      </div>
      <div className="card">
        {MYTHS.map((m) => (
          <div className="bullet" key={m}>
            <span className="bullet-dot" style={{ color: 'var(--danger)' }}>
              ✕
            </span>
            <span className="hint">{m}</span>
          </div>
        ))}
      </div>
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
