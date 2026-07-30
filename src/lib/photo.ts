export interface CompressedPhoto {
  blob: Blob
  width: number
  height: number
  bytes: number
  quality: number
}

/** Longest edge after downscaling. Plenty for a feed at 3x density. */
const MAX_DIM = 1600
/** Byte budget per photo. The free-tier storage math depends on this holding. */
const TARGET_BYTES = 260_000
const START_QUALITY = 0.72
const MIN_QUALITY = 0.4

/**
 * Decode to a bitmap, honouring EXIF orientation so a portrait shot from a
 * phone doesn't come out sideways. Falls back to an <img> for browsers without
 * createImageBitmap options support.
 */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* fall through to the <img> path */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'sync'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('That file could not be read as an image'))
      img.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Downscale and re-encode a camera photo to a predictable size.
 *
 * Two things beyond size come free with re-encoding through a canvas:
 * an iPhone HEIC becomes a JPEG every browser can display, and all EXIF is
 * dropped — including the GPS coordinates phones attach by default, which you
 * do not want to publish along with a gym photo.
 */
export async function compressPhoto(
  file: File,
  maxDim = MAX_DIM,
  targetBytes = TARGET_BYTES,
): Promise<CompressedPhoto> {
  const src = await decode(file)
  const sw = 'width' in src ? src.width : 0
  const sh = 'height' in src ? src.height : 0
  if (!sw || !sh) throw new Error('That image has no readable dimensions')

  const scale = Math.min(1, maxDim / Math.max(sw, sh))
  const width = Math.max(1, Math.round(sw * scale))
  const height = Math.max(1, Math.round(sh * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable')
  ctx.drawImage(src as CanvasImageSource, 0, 0, width, height)
  if ('close' in src) src.close()

  const encode = (q: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not encode the image'))),
        'image/jpeg',
        q,
      )
    })

  // Step the quality down until it fits the budget. Photos vary enormously in
  // how well they compress, so a fixed quality can't guarantee a size.
  let quality = START_QUALITY
  let blob = await encode(quality)
  while (blob.size > targetBytes && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - 0.08)
    blob = await encode(quality)
  }

  return { blob, width, height, bytes: blob.size, quality }
}

export function fmtBytes(n: number): string {
  return n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`
}
