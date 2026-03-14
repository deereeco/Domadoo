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
import LabelManager from './components/Labels/LabelManager.jsx'
import DayCleanupModal from './components/DayCleanupModal.jsx'
import DemoModal from './components/DemoModal.jsx'

function todayString() {
  return new Date().toISOString().split('T')[0]
}

export default function App() {
  const {
    user, setUser, signOut: storeSignOut, hydrate,
    detailsModalNodeId, showLabelManager, theme,
    lastCleanupDate, todaysTasksRootId,
    initCleanupDate, runDailyCleanup, seedDemoTodaysTasks,
    pendingCleanupTasks, showDemoModal, setShowDemoModal,
    dragMode, toggleDragMode,
  } = useStore()
  useDebugConsole()

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
      if (state.lastCleanupDate !== today && (state.todaysTasksRootId || state.tomorrowsTasksRootId)) {
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
          className="fixed bottom-0 right-0 w-16 h-16 z-50 pointer-events-none"
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
      {showLabelManager && <LabelManager />}
      {pendingCleanupTasks && pendingCleanupTasks.length > 0 && <DayCleanupModal />}
      {showDemoModal && <DemoModal onClose={() => setShowDemoModal(false)} />}

      {/* Floating Drag Mode FAB */}
      <button
        data-testid="drag-toggle"
        onClick={toggleDragMode}
        className={`fixed bottom-6 left-6 z-40 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium shadow-lg transition-colors ${
          dragMode
            ? 'bg-indigo-500 text-white shadow-indigo-200 dark:shadow-indigo-900'
            : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700'
        }`}
        title="Toggle drag mode"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 6v5h5V6h-5zm-7 0v5h5V6H6zm0 7v5h5v-5H6zm7 0v5h5v-5h-5z"/>
        </svg>
        Drag
      </button>

      {/* Hidden debug tap zone — quadruple-tap bottom-right to open Eruda */}
      <div
        className="fixed bottom-0 right-0 w-16 h-16 z-50 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  )
}
