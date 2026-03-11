import { useEffect } from 'react'
import { useStore } from './store/useStore.js'
import { useSyncDrive } from './hooks/useSyncDrive.js'
import { useDebugConsole } from './hooks/useDebugConsole.js'
import SignIn from './components/Auth/SignIn.jsx'
import Header from './components/Layout/Header.jsx'
import FilterBar from './components/Labels/FilterBar.jsx'
import Board from './components/Board/Board.jsx'
import DetailsModal from './components/DetailsModal/DetailsModal.jsx'
import DoneTodayView from './components/DoneTodayView.jsx'
import LabelManager from './components/Labels/LabelManager.jsx'

export default function App() {
  const { user, detailsModalNodeId, showDoneToday, showLabelManager, theme } = useStore()
  const handleDebugTap = useDebugConsole()

  // Apply saved theme on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [])

  // Auto-save to localStorage + Drive
  useSyncDrive()

  if (!user) {
    return <SignIn />
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

      {/* Hidden debug tap zone — quadruple-tap bottom-right to open Eruda */}
      <div
        onPointerDown={handleDebugTap}
        className="fixed bottom-0 right-0 w-16 h-16 z-50"
        aria-hidden="true"
      />
    </div>
  )
}
