import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore.js'
import { saveToCache } from '../services/localCache.js'
import { saveToDrive } from '../services/googleDrive.js'

export function useSyncDrive() {
  const state = useStore()
  const timerRef = useRef(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    // Always save to localStorage immediately
    saveToCache(state)

    // Debounced save to Drive (only if logged in)
    if (!state.user) return

    clearTimeout(timerRef.current)
    state.setSyncStatus('saving')
    timerRef.current = setTimeout(async () => {
      try {
        await saveToDrive(state)
        state.setSyncStatus('idle')
      } catch {
        state.setSyncStatus('error')
      }
    }, 2000)
  }, [state.nodes, state.labels, state.rootOrder, state.activeFilters, state.theme, state.todaysTasksRootId])
}
