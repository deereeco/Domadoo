import { useState } from 'react'
import ThemeToggle from './ThemeToggle.jsx'
import KeyboardShortcutsHelp from '../UI/KeyboardShortcutsHelp.jsx'
import { useStore } from '../../store/useStore.js'
import { signOut } from '../../services/googleAuth.js'
import { version } from '../../../package.json'

export default function Header() {
  const { user, syncStatus, addRootNode, signOut: storeSignOut, isDemoMode, setShowDemoModal } = useStore()
  const [showHelp, setShowHelp] = useState(false)
  const [avatarError, setAvatarError] = useState(false)

  const handleSignOut = () => {
    signOut()
    storeSignOut()
  }

  return (
    <header className="sticky top-0 z-40 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-screen-xl mx-auto px-4 h-14 grid grid-cols-3 items-center gap-4">
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

        {/* Centre: New Card */}
        <div className="flex justify-center">
          <button
            data-testid="add-card-btn"
            onClick={addRootNode}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
            title="New card (Ctrl+Shift+N)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
            </svg>
            New Card
          </button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 justify-end">
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
              {!avatarError && user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full cursor-pointer"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-8 h-8 rounded-full cursor-pointer bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                  <svg className="w-5 h-5 text-zinc-500 dark:text-zinc-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                  </svg>
                </div>
              )}
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
