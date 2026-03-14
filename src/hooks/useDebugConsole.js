import { useRef, useEffect } from 'react'

const TAP_COUNT = 4
const TAP_WINDOW_MS = 800

export function useDebugConsole() {
  const taps = useRef([])
  const initialized = useRef(false)

  useEffect(() => {
    const handler = (e) => {
      const inZone =
        e.clientX > window.innerWidth - 64 &&
        e.clientY > window.innerHeight - 64
      if (!inZone) return

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
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [])
}
