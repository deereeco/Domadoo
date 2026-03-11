import { useRef } from 'react'

const TAP_COUNT = 4
const TAP_WINDOW_MS = 800

export function useDebugConsole() {
  const taps = useRef([])
  const initialized = useRef(false)

  const handleTap = () => {
    const now = Date.now()
    taps.current = [...taps.current, now].filter(t => now - t < TAP_WINDOW_MS)

    if (taps.current.length >= TAP_COUNT && !initialized.current) {
      initialized.current = true
      import('eruda').then(({ default: eruda }) => {
        eruda.init()
        eruda.show()
      })
    }
  }

  return handleTap
}
