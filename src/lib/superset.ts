/**
 * Supersets: consecutive exercises that share a `superset` key are done as one
 * block, alternating a set of each (B1, B2, B1, B2…). The key is only a grouping
 * handle — what the lifter sees is a letter from the block's position in the
 * day (A, B, C…) and a number within it.
 *
 * Grouping is by adjacency, so a key only binds exercises that sit next to each
 * other. A lone exercise with a key is treated as a normal exercise.
 */

export interface Block {
  /** Letter for the block's position in the day: A, B, C… */
  letter: string
  /** Indices into the underlying array, in order. One entry for a plain exercise. */
  indices: number[]
  /** True for two or more exercises done as a superset. */
  isSuperset: boolean
}

function letterAt(n: number): string {
  // A…Z, then AA, AB… — a day never gets near this, but it shouldn't break.
  let s = ''
  n += 1
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export function blocksOf(items: { superset?: string }[]): Block[] {
  const blocks: Block[] = []
  let i = 0
  while (i < items.length) {
    const key = items[i].superset
    let j = i + 1
    if (key) while (j < items.length && items[j].superset === key) j++
    const indices = Array.from({ length: j - i }, (_, k) => i + k)
    blocks.push({ letter: letterAt(blocks.length), indices, isSuperset: indices.length > 1 })
    i = j
  }
  return blocks
}

/** "B1", "B2" for superset members; null for a plain exercise. */
export function memberTag(blocks: Block[], index: number): string | null {
  for (const b of blocks) {
    const k = b.indices.indexOf(index)
    if (k >= 0) return b.isSuperset ? `${b.letter}${k + 1}` : null
  }
  return null
}

export function newSupersetKey(): string {
  return `ss-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Tidy keys after an edit: a key left on a single exercise is cleared, and a key
 * that ends up on two separate runs is split so each run keeps its own. Returns
 * a new array only when something changed.
 */
export function normalizeSupersets<T extends { superset?: string }>(items: T[]): T[] {
  const out = items.map((x) => ({ ...x }))
  const seen = new Set<string>()
  let i = 0
  while (i < out.length) {
    const key = out[i].superset
    let j = i + 1
    if (key) while (j < out.length && out[j].superset === key) j++
    if (key) {
      if (j - i === 1) {
        delete out[i].superset
      } else if (seen.has(key)) {
        const fresh = newSupersetKey()
        for (let k = i; k < j; k++) out[k].superset = fresh
        seen.add(fresh)
      } else {
        seen.add(key)
      }
    }
    i = j
  }
  return out
}

/** Join the exercise at `index` with the next one, merging into its superset if it has one. */
export function linkWithNext<T extends { superset?: string }>(items: T[], index: number): T[] {
  if (index < 0 || index >= items.length - 1) return items
  const out = items.map((x) => ({ ...x }))
  const key = out[index].superset ?? out[index + 1].superset ?? newSupersetKey()
  const nextKey = out[index + 1].superset
  out[index].superset = key
  // Pull the whole following group in, not just its first member.
  for (let k = index + 1; k < out.length; k++) {
    if (k === index + 1 || (nextKey && out[k].superset === nextKey)) out[k].superset = key
    else break
  }
  return normalizeSupersets(out)
}

/** Split the superset between `index` and the next exercise. */
export function unlinkFromNext<T extends { superset?: string }>(items: T[], index: number): T[] {
  if (index < 0 || index >= items.length - 1) return items
  const out = items.map((x) => ({ ...x }))
  const key = out[index].superset
  if (!key || out[index + 1].superset !== key) return items
  const fresh = newSupersetKey()
  for (let k = index + 1; k < out.length && out[k].superset === key; k++) out[k].superset = fresh
  return normalizeSupersets(out)
}
