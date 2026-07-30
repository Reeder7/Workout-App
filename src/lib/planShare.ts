import type { Plan, PlanDay, PlanExercise } from '../types'

/**
 * Encode a plan into a shareable link, and decode it back.
 *
 * The whole program travels inside the URL's hash fragment, which browsers
 * never send to a server — so sharing a program needs no backend and no
 * account. Payloads are deflate-compressed where the browser supports it
 * (every current mobile browser does) and fall back to plain base64 otherwise.
 *
 *   payload = "2" + base64url(deflate-raw(json))   // compressed
 *           | "1" + base64url(utf8(json))          // uncompressed fallback
 */

interface SharedExercise {
  e: string // exerciseId
  s: number // sets
  a: number // repMin
  b: number // repMax
  r: number // rir
  t: number // restSec
  k?: { a: number; b: number; r: number; t: number; l?: string; m?: string; h?: 1 }[] // per-set scheme
  o?: string // role
  n?: string // note
}

interface SharedPlan {
  v: 1
  n: string // name
  d?: string // description
  w: number // daysPerWeek
  y: { n: string; x: SharedExercise[] }[] // days
}

// ---------------------------------------------------------------- base64url

function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlToBuf(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : ''
  const bin = atob(b64 + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out.buffer
}

// ---------------------------------------------------------------- compression

async function deflate(text: string): Promise<ArrayBuffer | null> {
  const C = (globalThis as { CompressionStream?: typeof CompressionStream }).CompressionStream
  if (!C) return null
  try {
    const stream = new Blob([text]).stream().pipeThrough(new C('deflate-raw'))
    return await new Response(stream).arrayBuffer()
  } catch {
    return null
  }
}

async function inflate(buf: ArrayBuffer): Promise<string | null> {
  const D = (globalThis as { DecompressionStream?: typeof DecompressionStream })
    .DecompressionStream
  if (!D) return null
  try {
    const stream = new Blob([buf]).stream().pipeThrough(new D('deflate-raw'))
    return new TextDecoder().decode(await new Response(stream).arrayBuffer())
  } catch {
    return null
  }
}

// ---------------------------------------------------------------- encode

function toShared(plan: Plan): SharedPlan {
  return {
    v: 1,
    n: plan.name,
    d: plan.description || undefined,
    w: plan.daysPerWeek,
    y: plan.days.map((d) => ({
      n: d.name,
      x: d.exercises.map((pe) => {
        const out: SharedExercise = {
          e: pe.exerciseId,
          s: pe.sets,
          a: pe.repMin,
          b: pe.repMax,
          r: pe.rir,
          t: pe.restSec,
        }
        if (pe.scheme?.length) {
          out.k = pe.scheme.map((st) => ({
            a: st.repMin,
            b: st.repMax,
            r: st.rir,
            t: st.restSec,
            ...(st.label ? { l: st.label } : {}),
            ...(st.tempo ? { m: st.tempo } : {}),
            ...(st.isHold ? { h: 1 as const } : {}),
          }))
        }
        if (pe.role) out.o = pe.role
        if (pe.note) out.n = pe.note
        return out
      }),
    })),
  }
}

/** Build the shareable payload string for a plan. */
export async function encodePlan(plan: Plan): Promise<string> {
  const json = JSON.stringify(toShared(plan))
  const packed = await deflate(json)
  if (packed) return '2' + bufToB64url(packed)
  return '1' + bufToB64url(new TextEncoder().encode(json).buffer as ArrayBuffer)
}

/** Full share URL for a plan, based on where the app is currently served. */
export async function buildShareUrl(plan: Plan): Promise<string> {
  const payload = await encodePlan(plan)
  const base = `${location.origin}${location.pathname}`
  return `${base}#/import?d=${payload}`
}

// ---------------------------------------------------------------- decode

let seq = 0
function nid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`
}

function fromShared(sp: SharedPlan): Plan {
  const days: PlanDay[] = (sp.y ?? []).map((d) => ({
    id: nid('day'),
    name: String(d.n ?? 'Day'),
    exercises: (d.x ?? []).map((x): PlanExercise => {
      const pe: PlanExercise = {
        id: nid('pe'),
        exerciseId: String(x.e),
        sets: Number(x.s) || 1,
        repMin: Number(x.a) || 0,
        repMax: Number(x.b) || 0,
        rir: Number(x.r) || 0,
        restSec: Number(x.t) || 90,
      }
      if (x.k?.length) {
        pe.scheme = x.k.map((st) => ({
          repMin: Number(st.a) || 0,
          repMax: Number(st.b) || 0,
          rir: Number(st.r) || 0,
          restSec: Number(st.t) || pe.restSec,
          ...(st.l ? { label: String(st.l) } : {}),
          ...(st.m ? { tempo: String(st.m) } : {}),
          ...(st.h ? { isHold: true } : {}),
        }))
      }
      if (x.o) pe.role = String(x.o)
      if (x.n) pe.note = String(x.n)
      return pe
    }),
  }))

  return {
    id: nid('plan'),
    name: String(sp.n ?? 'Shared plan'),
    description: sp.d ? String(sp.d) : undefined,
    daysPerWeek: Number(sp.w) || days.length,
    days,
    createdAt: Date.now(),
  }
}

/** Decode a payload back into a plan, or null if it isn't valid. */
export async function decodePlan(payload: string): Promise<Plan | null> {
  try {
    const mode = payload[0]
    const body = payload.slice(1)
    let json: string | null = null
    if (mode === '2') {
      json = await inflate(b64urlToBuf(body))
    } else if (mode === '1') {
      json = new TextDecoder().decode(b64urlToBuf(body))
    }
    if (!json) return null
    const sp = JSON.parse(json) as SharedPlan
    if (!sp || typeof sp !== 'object' || !Array.isArray(sp.y) || typeof sp.n !== 'string') {
      return null
    }
    const plan = fromShared(sp)
    return plan.days.length ? plan : null
  } catch {
    return null
  }
}
