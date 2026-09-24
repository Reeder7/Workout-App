import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Icon } from './Icon'
import { Segmented } from './Segmented'
import { PainScale } from './PainScale'
import {
  BASELINE_MIN,
  SWELLING_HINT,
  SWELLING_LABEL,
  baselineFor,
  dayKey,
  daysWithoutSwelling,
  kneeStatus,
} from '../lib/knee'
import { toast } from '../lib/toast'
import type { Swelling } from '../types'

/**
 * The morning knee check-in on the Train tab. Three answers before training;
 * once saved, it turns into the traffic light for the day, with step-back one
 * tap away on yellow or red.
 */
export function KneeCheckinCard() {
  const checkins = useStore((s) => s.kneeCheckins)
  const save = useStore((s) => s.saveKneeCheckin)
  const stepBackDay = useStore((s) => s.stepBackDay)
  const setStepBack = useStore((s) => s.setStepBack)

  const today = dayKey()
  const todays = checkins.find((c) => c.day === today)
  const [editing, setEditing] = useState(false)

  if (!todays || editing) {
    return (
      <CheckinForm
        initial={todays}
        onCancel={todays ? () => setEditing(false) : undefined}
        onSave={(c) => {
          save({ day: today, ...c })
          setEditing(false)
          toast('Check-in saved', 'success')
        }}
      />
    )
  }

  const base = baselineFor(checkins, today)
  const status = kneeStatus(todays, base)
  const dry = daysWithoutSwelling(checkins)
  const steppedBack = stepBackDay === today

  return (
    <div className={`card knee-card tone-${status.tone}`}>
      <div className="row" style={{ gap: 'var(--space-3)', alignItems: 'flex-start' }}>
        <span className={`knee-light tone-${status.tone}`} aria-hidden="true">
          <Icon name={status.tone === 'good' ? 'check' : 'info'} size={16} />
        </span>
        <div className="grow">
          <div className="eyebrow">Knee today · {status.light}</div>
          <div className="advice-headline">{status.headline}</div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={() => setEditing(true)}>
          <Icon name="edit" size={14} /> Edit
        </button>
      </div>

      <div className="knee-readings">
        <Reading label="Pain" value={todays.pain} normal={base?.pain} />
        <Reading label="Stairs" value={todays.stairs} normal={base?.stairs} />
        <div className="knee-reading">
          <div className="knee-reading-label">Swelling</div>
          <div className="knee-reading-value">{SWELLING_LABEL[todays.swelling]}</div>
          <div className="faint knee-reading-sub">
            {dry > 0 ? `none for ${dry} day${dry === 1 ? '' : 's'}` : 'today'}
          </div>
        </div>
      </div>

      <p className="hint" style={{ margin: 'var(--space-2) 0 0' }}>
        {status.reasons.length > 0 && <b>{capitalise(status.reasons.join(', '))}. </b>}
        {status.advice}
      </p>

      {status.tone !== 'good' && (
        <button
          className={`btn btn-block ${steppedBack ? 'btn-ghost' : 'btn-primary'}`}
          style={{ marginTop: 'var(--space-3)' }}
          aria-pressed={steppedBack}
          onClick={() => {
            setStepBack(!steppedBack)
            toast(steppedBack ? 'Step-back off' : 'Step-back on for today', 'success')
          }}
        >
          <Icon name={steppedBack ? 'x' : 'check'} size={16} />
          {steppedBack ? 'Stepped back today — undo' : 'Step back today’s knee work'}
        </button>
      )}
      {status.tone === 'good' && steppedBack && (
        <button
          className="btn btn-sm btn-ghost"
          style={{ marginTop: 'var(--space-2)' }}
          onClick={() => setStepBack(false)}
        >
          Step-back is still on for today — turn it off
        </button>
      )}
      {!base && (
        <p className="faint" style={{ fontSize: 12, margin: 'var(--space-2) 0 0' }}>
          Your normal is worked out from your last seven check-ins, once there are{' '}
          {BASELINE_MIN}.
        </p>
      )}
    </div>
  )
}

function Reading({ label, value, normal }: { label: string; value?: number; normal?: number }) {
  return (
    <div className="knee-reading">
      <div className="knee-reading-label">{label}</div>
      <div className="knee-reading-value">{value == null ? '—' : `${value}/10`}</div>
      <div className="faint knee-reading-sub">
        {value == null ? 'not logged' : normal != null ? `normal ${fmt(normal)}` : 'no normal yet'}
      </div>
    </div>
  )
}

function CheckinForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: { pain: number; stairs?: number; swelling: Swelling }
  onSave: (c: { pain: number; stairs?: number; swelling: Swelling }) => void
  onCancel?: () => void
}) {
  const [pain, setPain] = useState<number | undefined>(initial?.pain)
  const [stairs, setStairs] = useState<number | undefined>(initial?.stairs)
  const [swelling, setSwelling] = useState<Swelling>(initial?.swelling ?? 'none')

  return (
    <div className="card knee-card">
      <div className="eyebrow">Morning check-in</div>
      <div className="advice-headline">How’s the knee?</div>

      <div className="knee-q">Pain right now</div>
      <PainScale value={pain} onChange={setPain} label="Knee pain right now" />

      <div className="knee-q">Swelling</div>
      <Segmented
        label="Swelling"
        value={swelling}
        onChange={setSwelling}
        options={(['none', 'slight', 'obvious'] as Swelling[]).map((v) => ({
          value: v,
          label: SWELLING_LABEL[v],
        }))}
      />
      <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>
        {SWELLING_HINT[swelling]}
      </div>

      <div className="knee-q">Walking down one flight of stairs</div>
      <PainScale value={stairs} onChange={setStairs} label="Pain walking down stairs" allowSkip />

      <div className="row" style={{ gap: 10, marginTop: 'var(--space-4)' }}>
        {onCancel && (
          <button className="btn btn-ghost grow" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          className="btn btn-primary grow"
          disabled={pain == null}
          onClick={() => pain != null && onSave({ pain, stairs, swelling })}
        >
          <Icon name="check" size={16} /> Save check-in
        </button>
      </div>
    </div>
  )
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
