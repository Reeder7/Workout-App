import { toast } from './toast'

/**
 * Copy text to the clipboard, with a fallback for the contexts where the async
 * Clipboard API isn't available — non-secure origins and older in-app WebViews,
 * which is exactly where someone might open a shared link from a message.
 *
 * Toasts on the way out so every caller reports success and failure the same
 * way. Returns whether the copy actually happened.
 */
export async function copyText(text: string, successMessage: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      // Off-screen but still selectable; display:none would break execCommand.
      ta.style.position = 'fixed'
      ta.style.top = '-1000px'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      if (!ok) throw new Error('execCommand copy failed')
    }
    toast(successMessage, 'success')
    return true
  } catch {
    toast("Couldn't copy — try Share instead", 'danger')
    return false
  }
}
