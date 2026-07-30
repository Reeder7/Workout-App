import { useState } from 'react'
import { buildShareUrl } from '../lib/planShare'
import { Icon } from './Icon'
import type { Plan } from '../types'

/**
 * Share a plan as a link. Uses the native share sheet where available
 * (iOS/Android), otherwise copies the link to the clipboard.
 */
export function SharePlanButton({
  plan,
  className = 'btn btn-ghost btn-block',
  label = 'Share program',
}: {
  plan: Plan
  className?: string
  label?: string
}) {
  const [status, setStatus] = useState<'idle' | 'working' | 'copied' | 'error'>('idle')

  async function share() {
    setStatus('working')
    try {
      const url = await buildShareUrl(plan)
      const nav = navigator as Navigator & {
        share?: (d: { title?: string; text?: string; url?: string }) => Promise<void>
      }
      if (nav.share) {
        try {
          await nav.share({ title: plan.name, text: `${plan.name} — training program`, url })
          setStatus('idle')
          return
        } catch (e) {
          // User cancelled the sheet — not an error worth reporting.
          if ((e as Error)?.name === 'AbortError') {
            setStatus('idle')
            return
          }
        }
      }
      await navigator.clipboard.writeText(url)
      setStatus('copied')
      setTimeout(() => setStatus('idle'), 2200)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2600)
    }
  }

  return (
    <>
      <button className={className} onClick={share} disabled={status === 'working'}>
        <Icon name="share" size={16} />{' '}
        {status === 'working'
          ? 'Preparing…'
          : status === 'copied'
            ? 'Link copied'
            : status === 'error'
              ? 'Couldn’t share'
              : label}
      </button>
      {status === 'copied' && (
        <p className="hint" style={{ margin: '8px 0 0', fontSize: 12 }}>
          Paste it to a friend — opening it adds this program to their app.
        </p>
      )}
    </>
  )
}
