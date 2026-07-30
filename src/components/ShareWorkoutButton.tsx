import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { Sheet } from './Sheet'
import { useStore } from '../store/useStore'
import { EXERCISE_BY_ID } from '../data/exercises'
import { renderSummaryCard, summaryData } from '../lib/summaryCard'
import { toast } from '../lib/toast'
import type { Session } from '../types'

interface Props {
  session: Session
  className?: string
  label?: string
}

export function ShareWorkoutButton({
  session,
  className = 'btn btn-block',
  label = 'Share this workout',
}: Props) {
  const sessions = useStore((s) => s.sessions)
  const custom = useStore((s) => s.customExercises)
  const unit = useStore((s) => s.settings.unit)

  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Revoke the object URL when it changes or the component goes away, so a
  // few shares don't leak megabytes of image.
  useEffect(() => {
    if (!url) return
    return () => URL.revokeObjectURL(url)
  }, [url])

  async function build() {
    setOpen(true)
    setError(null)
    setUrl(null)
    setBlob(null)
    try {
      const data = summaryData(
        session,
        (id) => EXERCISE_BY_ID[id] ?? custom.find((e) => e.id === id),
        sessions,
        unit,
      )
      const png = await renderSummaryCard(data)
      setBlob(png)
      setUrl(URL.createObjectURL(png))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build the image')
    }
  }

  const fileName = `${session.name.replace(/[^\w]+/g, '-').toLowerCase()}.png`

  async function share() {
    if (!blob) return
    const file = new File([blob], fileName, { type: 'image/png' })
    // Web Share with files where supported (iOS Safari, Android Chrome);
    // everything else gets a download, which is the honest fallback.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: session.name })
        return
      } catch (e) {
        // A cancelled share is not a failure worth reporting.
        if (e instanceof Error && e.name === 'AbortError') return
      }
    }
    download()
  }

  function download() {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    toast('Image saved', 'success')
  }

  const canShareFiles = typeof navigator.canShare === 'function'

  return (
    <>
      <button className={className} onClick={build}>
        <Icon name="share" size={16} /> {label}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Share workout">
        {error ? (
          <p className="hint" style={{ marginTop: 0 }}>
            {error}
          </p>
        ) : url ? (
          <>
            <img src={url} alt={`Summary card for ${session.name}`} className="card-preview" />
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 'var(--space-4)' }}
              onClick={share}
            >
              <Icon name="share" size={18} /> {canShareFiles ? 'Share image' : 'Save image'}
            </button>
            {canShareFiles && (
              <button
                className="btn btn-block"
                style={{ marginTop: 'var(--space-2)' }}
                onClick={download}
              >
                <Icon name="download" size={16} /> Save to photos instead
              </button>
            )}
          </>
        ) : (
          <div className="card-preview is-loading" aria-label="Building image" />
        )}
      </Sheet>
    </>
  )
}
