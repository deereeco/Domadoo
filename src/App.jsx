import { useEffect } from 'react'
import { useStore } from './store/useStore.js'
import { useSyncDrive } from './hooks/useSyncDrive.js'
import { useDebugConsole } from './hooks/useDebugConsole.js'
import { initGoogleAuth, silentRequestToken, getUserInfo } from './services/googleAuth.js'
import { loadFromDrive } from './services/googleDrive.js'
import SignIn from './components/Auth/SignIn.jsx'
import Header from './components/Layout/Header.jsx'
import FilterBar from './components/Labels/FilterBar.jsx'
import Board from './components/Board/Board.jsx'
import DetailsModal from './components/DetailsModal/DetailsModal.jsx'
import DoneTodayView from './components/DoneTodayView.jsx'
import LabelManager from './components/Labels/LabelManager.jsx'
import DayCleanupModal from './components/DayCleanupModal.jsx'
import HistoryView from './components/HistoryView.jsx'
import DemoModal from './components/DemoModal.jsx'

function todayString() {
  return new Date().toISOString().split('T')[0]
}

export default function App() {
  const {
    user, setUser, signOut: storeSignOut, hydrate,
    detailsModalNodeId, showDoneToday, showLabelManager, theme,
    lastCleanupDate, todaysTasksRootId,
    initCleanupDate, runDailyCleanup, seedDemoTodaysTasks,
    pendingCleanupTasks, showHistory, showDemoModal, setShowDemoModal,
  } = useStore()
  const handleDebugTap = useDebugConsole()

  // Apply saved theme on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [])

  // Handle ?simulate=nextDay URL param for manual testing / demos
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('simulate') !== 'nextDay') return
    // Clear param from URL to avoid re-triggering on refresh
    window.history.replaceState({}, '', window.location.pathname)
    // Seed demo tasks if Today's Tasks is empty or missing
    const { todaysTasksRootId: tid, nodes } = useStore.getState()
    if (!tid || !nodes[tid] || nodes[tid].childrenIds.length === 0) {
      seedDemoTodaysTasks()
    }
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    initCleanupDate(yesterday.toISOString().split('T')[0])
    runDailyCleanup()
  }, [])

  // Daily cleanup check on mount and when tab regains focus
  useEffect(() => {
    const check = () => {
      const state = useStore.getState()
      const today = todayString()
      if (!state.lastCleanupDate) {
        state.initCleanupDate(today)
        return
      }
      if (state.lastCleanupDate !== today && state.todaysTasksRootId) {
        state.runDailyCleanup()
      }
    }
    check()
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [])

  // Initialize Google auth client and attempt silent re-auth if user is persisted
  useEffect(() => {
    if (!window.google) return

    initGoogleAuth({
      onSignIn: async (token) => {
        const info = await getUserInfo(token)
        const userInfo = { name: info.name, email: info.email, picture: info.picture }
        const driveData = await loadFromDrive()
        if (driveData) hydrate(driveData)
        setUser(userInfo)
      },
      onError: (err) => {
        console.warn('[auth] silent re-auth failed:', err, '→ signing out')
        storeSignOut()
      },
    })

    if (user) {
      console.log('[auth] persisted user detected, attempting silent re-auth')
      silentRequestToken()
    } else {
      console.log('[auth] no user in store, showing sign-in page')
    }
  }, [])

  // Auto-save to localStorage + Drive
  useSyncDrive()

  if (!user) {
    return (
      <>
        <SignIn />
        <div
          onPointerDown={handleDebugTap}
          className="fixed bottom-0 right-0 w-16 h-16 z-50"
          aria-hidden="true"
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Header />
      <FilterBar />
      <Board />

      {/* Modals */}
      {detailsModalNodeId && <DetailsModal />}
      {showDoneToday && <DoneTodayView />}
      {showLabelManager && <LabelManager />}
      {pendingCleanupTasks && pendingCleanupTasks.length > 0 && <DayCleanupModal />}
      {showHistory && <HistoryView />}
      {showDemoModal && <DemoModal onClose={() => setShowDemoModal(false)} />}

      {/* Hidden debug tap zone — quadruple-tap bottom-right to open Eruda */}
      <div
        onPointerDown={handleDebugTap}
        className="fixed bottom-0 right-0 w-16 h-16 z-50"
        aria-hidden="true"
      />
    </div>
  )
}
