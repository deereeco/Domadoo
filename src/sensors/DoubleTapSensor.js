import { PointerSensor } from '@dnd-kit/core'

const lastTapInfo = new WeakMap() // element → { time, x, y }
const DOUBLE_TAP_WINDOW = 350 // ms between first and second tap
const DOUBLE_TAP_DISTANCE = 25 // px tolerance between taps

export class DoubleTapSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown',
      handler: ({ nativeEvent: event }, { onActivation }) => {
        // Ignore non-primary mouse buttons on desktop
        if (event.pointerType === 'mouse' && event.button !== 0) return false

        const target = event.currentTarget
        const now = Date.now()
        const prev = lastTapInfo.get(target)

        if (prev) {
          const dt = now - prev.time
          const dx = Math.abs(event.clientX - prev.x)
          const dy = Math.abs(event.clientY - prev.y)
          if (dt < DOUBLE_TAP_WINDOW && dx < DOUBLE_TAP_DISTANCE && dy < DOUBLE_TAP_DISTANCE) {
            // Double tap detected — activate sensor, hold constraint will gate actual drag start
            lastTapInfo.delete(target)
            onActivation({ event })
            return true
          }
        }

        // First tap — record and wait
        lastTapInfo.set(target, { time: now, x: event.clientX, y: event.clientY })
        setTimeout(() => lastTapInfo.delete(target), DOUBLE_TAP_WINDOW)
        return false
      }
    }
  ]
}
