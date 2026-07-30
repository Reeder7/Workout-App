import { useMemo, useState } from 'react'
import { Sheet } from './Sheet'
import { useStore } from '../store/useStore'
import { MUSCLE_GROUPS } from '../data/exercises'
import type { Exercise, MuscleGroup } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  onPick: (exercise: Exercise) => void
}

export function ExercisePicker({ open, onClose, onPick }: Props) {
  const all = useStore((s) => s.allExercises())
  const addCustom = useStore((s) => s.addCustomExercise)
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | 'All'>('All')
  const [showNew, setShowNew] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all
      .filter((e) => (muscle === 'All' ? true : e.primary === muscle))
      .filter((e) => (q ? e.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [all, query, muscle])

  function pick(e: Exercise) {
    onPick(e)
    setQuery('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Choose Exercise">
      <input
        autoFocus
        placeholder="Search exercises…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 12 }}
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

      <div style={{ marginTop: 6 }}>
        {filtered.map((e) => (
          <button
            key={e.id}
            className="lrow"
            style={{ width: '100%', textAlign: 'left', background: 'none' }}
            onClick={() => pick(e)}
          >
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{e.name}</div>
              <div className="faint" style={{ fontSize: 12 }}>
                {e.primary} · {e.equipment} · {e.category}
              </div>
            </div>
            <span className="accent" style={{ fontSize: 20 }}>
              +
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="faint center" style={{ padding: '20px 0' }}>
            No matches.
          </p>
        )}
      </div>

      {!showNew ? (
        <button
          className="btn btn-ghost btn-block"
          style={{ marginTop: 14 }}
          onClick={() => setShowNew(true)}
        >
          + Create custom exercise
        </button>
      ) : (
        <NewExerciseForm
          initialName={query}
          onCancel={() => setShowNew(false)}
          onCreate={(data) => {
            const ex = addCustom(data)
            setShowNew(false)
            pick(ex)
          }}
        />
      )}
    </Sheet>
  )
}

function NewExerciseForm({
  initialName,
  onCreate,
  onCancel,
}: {
  initialName: string
  onCreate: (e: Omit<Exercise, 'id' | 'custom'>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [primary, setPrimary] = useState<MuscleGroup>('Chest')
  const [equipment, setEquipment] = useState<Exercise['equipment']>('Barbell')
  const [category, setCategory] = useState<Exercise['category']>('Compound')

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        New Exercise
      </div>
      <input
        placeholder="Exercise name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ marginBottom: 10 }}
      />
      <div className="grid-2" style={{ marginBottom: 10 }}>
        <select value={primary} onChange={(e) => setPrimary(e.target.value as MuscleGroup)}>
          {MUSCLE_GROUPS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={equipment}
          onChange={(e) => setEquipment(e.target.value as Exercise['equipment'])}
        >
          {['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Smith', 'Bodyweight', 'Sled', 'Band', 'Other'].map(
            (x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ),
          )}
        </select>
      </div>
      <div className="grid-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Exercise['category'])}
        >
          <option value="Compound">Compound</option>
          <option value="Isolation">Isolation</option>
        </select>
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 10 }}
        disabled={!name.trim()}
        onClick={() =>
          onCreate({ name: name.trim(), primary, secondary: [], equipment, category })
        }
      >
        Create & Add
      </button>
    </div>
  )
}
