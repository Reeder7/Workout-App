export type ToastTone = 'neutral' | 'success' | 'danger'

export interface ToastMessage {
  id: number
  text: string
  tone: ToastTone
}

type Listener = (t: ToastMessage) => void

const listeners = new Set<Listener>()
let nextId = 1

/** Fire a transient confirmation. Safe to call from anywhere, including stores. */
export function toast(text: string, tone: ToastTone = 'neutral') {
  const msg: ToastMessage = { id: nextId++, text, tone }
  listeners.forEach((l) => l(msg))
}

export function onToast(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
