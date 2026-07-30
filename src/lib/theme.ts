import type { ThemePref } from '../types'

/**
 * Applies the colour theme to the document root. Stylesheets key off
 * `data-theme="light" | "dark"`, so an explicit preference always wins and
 * 'system' follows the device.
 */
export function applyTheme(pref: ThemePref = 'light'): void {
  const root = document.documentElement
  const prefersDark =
    typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = pref === 'system' ? (prefersDark ? 'dark' : 'light') : pref
  root.setAttribute('data-theme', resolved)
  root.style.colorScheme = resolved
  // Keep the iOS status bar / browser chrome in step with the theme.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute(
      'content',
      getComputedStyle(root).getPropertyValue('--bg').trim() ||
        (resolved === 'dark' ? '#0a0a0b' : '#ffffff'),
    )
  }
}

/** Re-apply on device theme changes while the preference is 'system'. */
export function watchSystemTheme(getPref: () => ThemePref): () => void {
  if (typeof matchMedia !== 'function') return () => {}
  const mq = matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (getPref() === 'system') applyTheme('system')
  }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
