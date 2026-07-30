import type { Exercise, Session } from '../types'
import { e1rm, sessionVolume } from './stats'
import { fmtDate, fmtDuration, fmtNum, fmtWeight } from './format'

/** 4:5 — the tallest aspect most feeds show without cropping. */
export const CARD_W = 1080
export const CARD_H = 1350

export interface CardLine {
  name: string
  best: string
  isPr: boolean
}

export interface CardData {
  title: string
  date: string
  volume: string
  sets: string
  duration: string
  unit: string
  lines: CardLine[]
  deload: boolean
}

/** Row height bounds. Rows stretch to fill the card, within these limits. */
const MIN_ROW = 74
const MAX_ROW = 112

/**
 * Reduce a finished session to what belongs on a share card: the headline
 * numbers, and the best set of each lift. A set-by-set dump is unreadable at
 * feed size.
 */
export function summaryData(
  session: Session,
  exerciseOf: (id: string) => Exercise | undefined,
  allSessions: Session[],
  unit: string,
): CardData {
  // Only sessions strictly older than this one count toward "was it a PR",
  // otherwise every lift in the session beats itself.
  const earlier = allSessions.filter((s) => s.date < session.date)

  const lines: CardLine[] = session.exercises.map((ex) => {
    const best = ex.sets.reduce(
      (b, st) => (st.weight > b.weight || (st.weight === b.weight && st.reps > b.reps) ? st : b),
      ex.sets[0],
    )
    const bestE1rm = ex.sets.reduce((m, st) => Math.max(m, e1rm(st.weight, st.reps)), 0)
    const priorBest = earlier.reduce((m, s) => {
      const prev = s.exercises.find((e) => e.exerciseId === ex.exerciseId)
      if (!prev) return m
      return Math.max(m, ...prev.sets.map((st) => e1rm(st.weight, st.reps)))
    }, 0)

    const meta = exerciseOf(ex.exerciseId)
    const isHold = ex.sets.some((st) => st.target?.isHold)
    const bodyweight = !best || best.weight <= 0
    return {
      name: meta?.name ?? 'Exercise',
      best: isHold
        ? `${best?.reps ?? 0}s hold`
        : // "2 × 9" would read as 2 lb; BW says what the load actually was.
          bodyweight
          ? `BW × ${best?.reps ?? 0}`
          : `${fmtWeight(best.weight)} ${unit} × ${best.reps}`,
      // A bodyweight or hold movement has no meaningful estimated 1RM, so it
      // never claims a PR.
      isPr: !bodyweight && !isHold && bestE1rm > 0 && priorBest > 0 && bestE1rm > priorBest,
    }
  })

  const setCount = session.exercises.reduce((t, ex) => t + ex.sets.length, 0)
  return {
    title: session.name,
    date: fmtDate(session.date),
    volume: fmtNum(sessionVolume(session)),
    sets: String(setCount),
    duration: fmtDuration(session.durationSec),
    unit,
    lines,
    deload: !!session.deload,
  }
}

/** Read a design token off the live document so the card can't drift. */
function token(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width <= maxW || !line) {
      line = next
    } else {
      lines.push(line)
      line = w
      if (lines.length === maxLines) break
    }
  }
  if (lines.length < maxLines && line) lines.push(line)
  if (lines.length === maxLines) {
    // Ellipsise the final line rather than letting it run past the edge.
    let last = lines[maxLines - 1]
    if (ctx.measureText(last).width > maxW) {
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1)
      lines[maxLines - 1] = `${last}…`
    }
  }
  return lines
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * Draw the card with the Canvas 2D API rather than rasterising DOM. Canvas
 * resolves fonts through document.fonts, so the card gets the real UI typeface
 * with no embedding, and unlike an SVG foreignObject it works everywhere and
 * never taints the canvas.
 */
export async function renderSummaryCard(data: CardData): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable')

  const font = token('--font-sans', 'system-ui')
  const bg = token('--surface-canvas', '#f6f7f9')
  const surface = token('--surface-1', '#ffffff')
  const surface2 = token('--surface-2', '#eef1f4')
  const ink = token('--ink-primary', '#0e1420')
  const ink2 = token('--ink-secondary', '#54606f')
  const ink3 = token('--ink-tertiary', '#77828f')
  const accent = token('--accent', '#0b7c77')
  const accentInk = token('--accent-ink', '#0c625f')
  const accentSubtle = token('--accent-subtle', '#ecf9f7')
  const warn = token('--warning', '#a16207')
  const warnSubtle = token('--warning-subtle', '#fef7e6')

  // Some browsers need the face explicitly ready before canvas will use it.
  if (document.fonts?.load) {
    await Promise.all([document.fonts.load(`640 64px ${font}`), document.fonts.load(`400 30px ${font}`)])
  }

  const PAD = 72
  const innerW = CARD_W - PAD * 2

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  let y = PAD + 34

  // Header: wordmark and date on one baseline.
  ctx.textBaseline = 'alphabetic'
  ctx.font = `600 26px ${font}`
  ctx.fillStyle = accentInk
  ctx.letterSpacing = '3px'
  ctx.fillText('SPOTTER', PAD, y)
  ctx.letterSpacing = '0px'
  ctx.font = `500 26px ${font}`
  ctx.fillStyle = ink3
  ctx.textAlign = 'right'
  ctx.fillText(data.date.toUpperCase(), CARD_W - PAD, y)
  ctx.textAlign = 'left'

  y += 78

  if (data.deload) {
    ctx.font = `600 24px ${font}`
    const label = 'DELOAD WEEK'
    const w = ctx.measureText(label).width + 40
    ctx.fillStyle = warnSubtle
    roundRect(ctx, PAD, y - 32, w, 46, 23)
    ctx.fill()
    ctx.fillStyle = warn
    ctx.fillText(label, PAD + 20, y)
    y += 68
  }

  // Title
  ctx.font = `640 68px ${font}`
  ctx.fillStyle = ink
  const titleLines = wrap(ctx, data.title, innerW, 2)
  for (const line of titleLines) {
    ctx.fillText(line, PAD, y + 22)
    y += 82
  }

  y += 34

  // Stat tiles
  const gap = 22
  const tileW = (innerW - gap * 2) / 3
  const tileH = 168
  const stats: [string, string][] = [
    [data.volume, `${data.unit.toUpperCase()} VOLUME`],
    [data.sets, 'SETS'],
    [data.duration, 'TIME'],
  ]
  stats.forEach(([value, label], i) => {
    const x = PAD + i * (tileW + gap)
    ctx.fillStyle = surface
    roundRect(ctx, x, y, tileW, tileH, 30)
    ctx.fill()

    ctx.fillStyle = ink
    // Long numbers step down a size rather than overflowing the tile.
    ctx.font = `640 ${value.length > 6 ? 52 : 62}px ${font}`
    ctx.fillText(value, x + 30, y + 92)

    ctx.font = `600 21px ${font}`
    ctx.fillStyle = ink3
    ctx.letterSpacing = '2px'
    ctx.fillText(label, x + 30, y + 132)
    ctx.letterSpacing = '0px'
  })

  y += tileH + 64

  // Lifts
  ctx.font = `600 22px ${font}`
  ctx.fillStyle = ink3
  ctx.letterSpacing = '2.5px'
  ctx.fillText('LIFTS', PAD, y)
  ctx.letterSpacing = '0px'
  y += 34

  /*
   * The list panel always reaches down to the footer, and the rows are centred
   * inside it. Two earlier attempts were worse: a fixed row cap overflowed the
   * footer on a two-line title, and stretching rows to fill left a visible hole
   * whenever a session had only three lifts.
   *
   * How many lifts fit is therefore derived from the panel, not assumed.
   */
  const footerTop = CARD_H - PAD - 74
  const listH = Math.max(160, footerTop - y - 14)
  const capacity = (reserve: number) =>
    Math.max(1, Math.floor((listH - 36 - reserve) / MIN_ROW))
  let shown = data.lines.slice(0, capacity(0))
  let more = data.lines.length - shown.length
  if (more > 0) {
    // Reserve the "+N more" line, which may itself cost a row.
    shown = data.lines.slice(0, capacity(46))
    more = data.lines.length - shown.length
  }
  const moreH = more > 0 ? 46 : 0
  const rowH = Math.max(MIN_ROW, Math.min(MAX_ROW, (listH - 36 - moreH) / shown.length))

  ctx.fillStyle = surface
  roundRect(ctx, PAD, y, innerW, listH, 30)
  ctx.fill()

  // Centre the block of rows in whatever height the panel ended up with.
  const rowsH = shown.length * rowH
  let ry = y + (listH - moreH - rowsH) / 2 + rowH / 2 - 16
  for (const line of shown) {
    // Best set first: it sets the right-hand column, and the name gets what's left.
    ctx.font = `600 30px ${font}`
    const bestW = ctx.measureText(line.best).width
    ctx.fillStyle = ink2
    ctx.textAlign = 'right'
    ctx.fillText(line.best, CARD_W - PAD - 34, ry + 20)
    ctx.textAlign = 'left'

    let prW = 0
    if (line.isPr) {
      ctx.font = `600 20px ${font}`
      prW = ctx.measureText('PR').width + 32
      const px = CARD_W - PAD - 34 - bestW - 20 - prW
      ctx.fillStyle = accentSubtle
      roundRect(ctx, px, ry - 6, prW, 38, 19)
      ctx.fill()
      ctx.fillStyle = accentInk
      ctx.fillText('PR', px + 16, ry + 20)
      prW += 20
    }

    ctx.font = `500 32px ${font}`
    ctx.fillStyle = ink
    const nameMax = innerW - 68 - bestW - 24 - prW
    ctx.fillText(wrap(ctx, line.name, nameMax, 1)[0] ?? '', PAD + 34, ry + 20)
    ry += rowH
  }

  if (more > 0) {
    ctx.font = `500 26px ${font}`
    ctx.fillStyle = ink3
    ctx.fillText(`+ ${more} more`, PAD + 34, ry + 14)
  }

  // Footer rule and caption
  const fy = CARD_H - PAD - 6
  ctx.fillStyle = surface2
  roundRect(ctx, PAD, fy - 58, innerW, 3, 2)
  ctx.fill()
  ctx.font = `500 25px ${font}`
  ctx.fillStyle = ink3
  ctx.fillText('Evidence-based training, tracked on device', PAD, fy)
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.arc(CARD_W - PAD - 9, fy - 9, 9, 0, Math.PI * 2)
  ctx.fill()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))),
      'image/png',
    )
  })
}
