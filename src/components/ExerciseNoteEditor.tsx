import { useStore } from '../store/useStore'

/**
 * Editable persistent note for an exercise (keyed by exerciseId). The note is
 * saved across workouts, so cues/reminders you jot down show up next time.
 */
export function ExerciseNoteEditor({
  exerciseId,
  compact,
}: {
  exerciseId: string
  compact?: boolean
}) {
  const note = useStore((s) => s.exerciseNotes[exerciseId] ?? '')
  const setNote = useStore((s) => s.setExerciseNote)

  return (
    <textarea
      value={note}
      onChange={(e) => setNote(exerciseId, e.target.value)}
      placeholder="Notes for next time — setup, seat height, cues, pain notes…"
      rows={compact ? 2 : 3}
      style={{ resize: 'vertical', marginTop: compact ? 8 : 0 }}
    />
  )
}
