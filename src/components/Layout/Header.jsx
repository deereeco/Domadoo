import { useState } from 'react'
import ThemeToggle from './ThemeToggle.jsx'
import KeyboardShortcutsHelp from '../UI/KeyboardShortcutsHelp.jsx'
import { useStore } from '../../store/useStore.js'
import { signOut } from '../../services/googleAuth.js'
import { version } from '../../../package.json'

export default function Header() {
  const { user, setShowDoneToday, showDoneToday, setShowLabelManager, syncStatus, addTodaysTasksCard, todaysTasksRootId, signOut: storeSignOut, dragMode, toggleDragMode, isDemoMode, setShowDemoModal } = useStore()
  const [showHelp, setShowHelp] = useState(false)

  const handleSignOut = () => {
    signOut()
    storeSignOut()
  }

  return (
    <header className="sticky top-0 z-40 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Left: App name */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col leading-tight">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Domadoo</h1>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">v{version}</span>
          </div>
          {syncStatus === 'saving' && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">Saving…</span>
          )}
          {syncStatus === 'error' && (
            <span className="text-xs text-red-400">Sync error</span>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          {!todaysTasksRootId && (
            <button
              onClick={addTodaysTasksCard}
              className="px-3 py-1.5 text-xs rounded-lg font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Add Today's Tasks card"
            >
              Today's Tasks
            </button>
          )}

          <button
            onClick={() => setShowDoneToday(!showDoneToday)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              showDoneToday
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            Done Today
          </button>

          <button
            onClick={() => setShowLabelManager(true)}
            className="px-3 py-1.5 text-xs rounded-lg font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Labels
          </button>

          <button
            data-testid="drag-toggle"
            onClick={toggleDragMode}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              dragMode
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title={dragMode ? 'Exit drag mode' : 'Enter drag mode'}
          >
            Drag
          </button>

          <button
            data-testid="demo-btn"
            onClick={() => setShowDemoModal(true)}
            className={`px-2 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              isDemoMode
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                : 'text-zinc-400 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title={isDemoMode ? 'Demo mode active' : 'Demo scenarios'}
          >
            {isDemoMode ? 'Demo ●' : 'Demo'}
          </button>

          <div className="relative">
            <button
              data-testid="keyboard-help-btn"
              onClick={() => setShowHelp(v => !v)}
              className="px-2 py-1.5 text-xs rounded-lg font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Keyboard shortcuts"
            >
              ?
            </button>
            {showHelp && <KeyboardShortcutsHelp onClose={() => setShowHelp(false)} />}
          </div>

          <ThemeToggle />

          {user && (
            <div className="relative group ml-1">
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full cursor-pointer"
              />
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg py-1 min-w-[160px] z-50">
                <p className="px-3 py-1 text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
