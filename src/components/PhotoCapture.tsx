import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { compressPhoto, fmtBytes, type CompressedPhoto } from '../lib/photo'

interface Props {
  onChange: (photo: CompressedPhoto | null) => void
  /** Copy under the empty frame, explaining why a photo is required. */
  hint?: string
}

export function PhotoCapture({ onChange, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [photo, setPhoto] = useState<CompressedPhoto | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return
    return () => URL.revokeObjectURL(url)
  }, [url])

  async function take(file: File) {
    setBusy(true)
    setError(null)
    try {
      const result = await compressPhoto(file)
      setPhoto(result)
      setUrl(URL.createObjectURL(result.blob))
      onChange(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That photo could not be processed')
      setPhoto(null)
      setUrl(null)
      onChange(null)
    } finally {
      setBusy(false)
    }
  }

  function clear() {
    setPhoto(null)
    setUrl(null)
    setError(null)
    onChange(null)
  }

  return (
    <div>
      {/*
        capture="environment" opens the camera rather than the photo library on
        a phone. It is a default, not a guarantee — a browser can still offer the
        library, and no web app can prevent that.
      */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) take(f)
          e.target.value = ''
        }}
      />

      {url ? (
        <div className="shot">
          <img src={url} alt="Your gym photo for this post" />
          <button className="shot-clear" onClick={clear} aria-label="Remove photo">
            <Icon name="x" size={16} />
          </button>
        </div>
      ) : (
        <button
          className={`shot-empty${busy ? ' is-busy' : ''}`}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <span className="shot-glyph">
            <Icon name="camera" size={26} />
          </span>
          <span className="shot-label">{busy ? 'Processing…' : 'Take a gym photo'}</span>
          {hint && !busy && <span className="shot-hint">{hint}</span>}
        </button>
      )}

      {error && (
        <p className="hint" style={{ color: 'var(--danger)', marginTop: 'var(--space-2)' }}>
          {error}
        </p>
      )}

      {photo && (
        <div className="row-between shot-meta">
          <span className="faint">
            {photo.width}×{photo.height} · {fmtBytes(photo.bytes)}
          </span>
          <button className="btn btn-sm btn-ghost" onClick={() => inputRef.current?.click()}>
            <Icon name="camera" size={14} /> Retake
          </button>
        </div>
      )}
    </div>
  )
}
