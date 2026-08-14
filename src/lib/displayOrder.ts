/**
 * Display ordering for an in-progress workout: finished work sinks, unfinished
 * floats, so the next thing to do is always at the top of the list.
 *
 * Only the render order changes. Each row carries the index it occupies in the
 * stored array, and every handler addresses that index — never the display
 * position — so re-ordering can never make a tap land on the wrong set. The
 * stored order is what gets logged and what the set numbers count from.
 *
 * `filter` preserves relative order, so the logged sequence is kept intact
 * inside each group: sets stay 1, 2, 3 among the unfinished and among the
 * finished, they just split into two blocks.
 */
export interface Positioned<T> {
  item: T
  /** Index in the underlying array — the one handlers must use. */
  index: number
}

export function sinkDone<T>(items: T[], isDone: (item: T) => boolean): Positioned<T>[] {
  const rows = items.map((item, index) => ({ item, index }))
  return [...rows.filter((r) => !isDone(r.item)), ...rows.filter((r) => isDone(r.item))]
}

/** An exercise counts as finished once it has sets and every one is done. */
export function isExerciseDone(ex: { sets: { done: boolean }[] }): boolean {
  return ex.sets.length > 0 && ex.sets.every((s) => s.done)
}
