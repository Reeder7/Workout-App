// Generates PWA PNG icons with no external deps (raw RGBA -> PNG via zlib).
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public')
mkdirSync(outDir, { recursive: true })

const BG = [10, 10, 11, 255] // #0a0a0b
const FG = [198, 242, 78, 255] // #c6f24e (accent)

// CRC32
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Rounded rectangle fill into the rgba buffer
function fillRect(buf, W, x0, y0, x1, y1, color, radius = 0) {
  const ix0 = Math.round(x0)
  const iy0 = Math.round(y0)
  const ix1 = Math.round(x1)
  const iy1 = Math.round(y1)
  for (let y = iy0; y < iy1; y++) {
    for (let x = ix0; x < ix1; x++) {
      if (radius > 0) {
        // corner rounding
        const cx = x < ix0 + radius ? ix0 + radius : x > ix1 - radius - 1 ? ix1 - radius - 1 : x
        const cy = y < iy0 + radius ? iy0 + radius : y > iy1 - radius - 1 ? iy1 - radius - 1 : y
        const dx = x - cx
        const dy = y - cy
        if (dx * dx + dy * dy > radius * radius) continue
      }
      const i = (y * W + x) * 4
      buf[i] = color[0]
      buf[i + 1] = color[1]
      buf[i + 2] = color[2]
      buf[i + 3] = color[3]
    }
  }
}

function drawDumbbell(S, pad) {
  const buf = Buffer.alloc(S * S * 4)
  // background
  for (let i = 0; i < S * S; i++) {
    buf[i * 4] = BG[0]
    buf[i * 4 + 1] = BG[1]
    buf[i * 4 + 2] = BG[2]
    buf[i * 4 + 3] = BG[3]
  }
  // glyph in normalized coords, scaled by (1 - 2*pad) and centered
  const scale = 1 - 2 * pad
  const off = pad
  const f = (v) => (off + v * scale) * S
  const r = Math.round(0.02 * S * scale)
  // handle
  fillRect(buf, S, f(0.34), f(0.455), f(0.66), f(0.545), FG, r)
  // left weights
  fillRect(buf, S, f(0.24), f(0.37), f(0.32), f(0.63), FG, r)
  fillRect(buf, S, f(0.16), f(0.41), f(0.24), f(0.59), FG, r)
  // right weights
  fillRect(buf, S, f(0.68), f(0.37), f(0.76), f(0.63), FG, r)
  fillRect(buf, S, f(0.76), f(0.41), f(0.84), f(0.59), FG, r)
  return encodePng(S, S, buf)
}

const targets = [
  { name: 'icon-192.png', size: 192, pad: 0.08 },
  { name: 'icon-512.png', size: 512, pad: 0.08 },
  { name: 'icon-512-maskable.png', size: 512, pad: 0.18 },
  { name: 'apple-touch-icon.png', size: 180, pad: 0.1 },
]
for (const t of targets) {
  writeFileSync(join(outDir, t.name), drawDumbbell(t.size, t.pad))
  console.log('wrote', t.name)
}

// favicon.svg (vector)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#0a0a0b"/>
  <g fill="#c6f24e">
    <rect x="34" y="45.5" width="32" height="9" rx="2"/>
    <rect x="24" y="37" width="8" height="26" rx="2"/>
    <rect x="16" y="41" width="8" height="18" rx="2"/>
    <rect x="68" y="37" width="8" height="26" rx="2"/>
    <rect x="76" y="41" width="8" height="18" rx="2"/>
  </g>
</svg>
`
writeFileSync(join(outDir, 'favicon.svg'), svg)
console.log('wrote favicon.svg')
