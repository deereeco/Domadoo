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
        const savedAt = await saveToDrive(state)
        state.setSyncStatus('idle')
        if (savedAt) state.setLastDriveSyncAt(savedAt)
      } catch {
        state.setSyncStatus('error')
      }
    }, 2000)
  }, [
    state.nodes, state.labels, state.rootOrder, state.activeFilters,
    state.theme, state.todaysTasksRootId, state.tomorrowsTasksRootId,
    state.isDemoMode, state.history, state.lastCleanupDate,
    state.collapsedCards, state.pinnedCards, state.deletedNodes,
  ])

  // Retry Drive save when connection is restored after going offline
  useEffect(() => {
    if (!state.user) return
    const handleOnline = () => {
      saveToDrive(state)
        .then(savedAt => {
          state.setSyncStatus('idle')
          if (savedAt) state.setLastDriveSyncAt(savedAt)
        })
        .catch(() => state.setSyncStatus('error'))
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [state.user])
}
