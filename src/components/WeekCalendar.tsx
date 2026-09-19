import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import { sessionVolume } from '../lib/stats'
import { fmtNum } from '../lib/format'
import type { Session } from '../types'

const DAY_MS = 24 * 60 * 60 * 1000
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** Midnight on the Monday of the week containing `ts`. */
export function mondayOf(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  // getDay() is 0=Sunday, so shift it so Monday lands on 0.
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

/**
 * Session names are "<plan> · <day>", and the plan name itself contains " · "
 * for this program — so the day is whatever follows the last separator. The
 * qualifier after an em dash is then dropped: a 46px column shows "Legs A"
 * where "Legs A — Quad focus" only ever renders as "Legs A — …".
 */
function dayLabel(name: string): string {
  const parts = name.split(' · ')
  const day = parts[parts.length - 1] || name
  return day.split(' — ')[0]
}

const monthDay = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

interface Props {
  sessions: Session[]
  unit: string
  /** Sessions per week the plan asks for, used for the "4 of 6" readout. */
  target: number
  onOpenSession: (id: string) => void
}

export function WeekCalendar({ sessions, unit, target, onOpenSession }: Props) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(Date.now()))
  const today = mondayOf(Date.now())

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const start = weekStart + i * DAY_MS
      const end = start + DAY_MS
      return {
        start,
        date: new Date(start).getDate(),
        // Comparing against the real clock, not the week being viewed.
        isToday: start <= Date.now() && Date.now() < end,
        isFuture: start > Date.now(),
        sessions: sessions.filter((s) => s.date >= start && s.date < end),
      }
    })
  }, [weekStart, sessions])

  const inWeek = days.flatMap((d) => d.sessions)
  const sets = inWeek.reduce(
    (t, s) => t + s.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0),
    0,
  )
  const volume = inWeek.reduce((t, s) => t + sessionVolume(s), 0)
  const isThisWeek = weekStart === today

  return (
    <div className="wkcal">
      <div className="row-between wkcal-head">
        <button
          className="icon-btn wkcal-nav"
          onClick={() => setWeekStart((w) => w - 7 * DAY_MS)}
          aria-label="Previous week"
        >
          <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
            <Icon name="chevron" size={16} />
          </span>
        </button>
        <div className="center">
          <div className="wkcal-title">{isThisWeek ? 'This week' : 'Week of'}</div>
          <div className="wkcal-range">
            {monthDay(weekStart)} – {monthDay(weekStart + 6 * DAY_MS)}
          </div>
        </div>
        <button
          className="icon-btn wkcal-nav"
          onClick={() => setWeekStart((w) => Math.min(today, w + 7 * DAY_MS))}
          disabled={isThisWeek}
          aria-label="Next week"
        >
          <Icon name="chevron" size={16} />
        </button>
      </div>

      <div className="wkcal-grid">
        {days.map((d, i) => {
          const trained = d.sessions.length > 0
          const label = trained ? dayLabel(d.sessions[0].name) : ''
          return (
            <button
              key={d.start}
              className={`wkcal-day${trained ? ' trained' : ''}${d.isToday ? ' today' : ''}${
                d.isFuture ? ' future' : ''
              }`}
              disabled={!trained}
              aria-label={
                trained
                  ? `${monthDay(d.start)}: ${d.sessions.map((s) => dayLabel(s.name)).join(', ')}`
                  : `${monthDay(d.start)}: no workout`
              }
              onClick={() => trained && onOpenSession(d.sessions[0].id)}
            >
              <span className="wkcal-letter">{LETTERS[i]}</span>
              <span className="wkcal-date">{d.date}</span>
              <span className="wkcal-mark" aria-hidden="true">
                {d.sessions.length > 1 ? d.sessions.length : ''}
              </span>
              <span className="wkcal-label">{label}</span>
            </button>
          )
        })}
      </div>

      <div className="wkcal-foot">
        {inWeek.length === 0
          ? isThisWeek
            ? 'Nothing logged yet this week.'
            : 'No workouts this week.'
          : `${inWeek.length} of ${target} sessions · ${sets} sets · ${fmtNum(
              Math.round(volume),
            )} ${unit}`}
      </div>
    </div>
  )
}
