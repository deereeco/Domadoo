import { useState, useRef, useEffect } from 'react'
import KeyboardShortcutsHelp from '../UI/KeyboardShortcutsHelp.jsx'
import { useStore } from '../../store/useStore.js'
import { signOut } from '../../services/googleAuth.js'
import { version } from '../../../package.json'

export default function Header() {
  const { user, syncStatus, addRootNode, signOut: storeSignOut, isDemoMode, setShowDemoModal, theme, toggleTheme, undo, redo } = useStore()
  const undoStack = useStore(s => s._undoStack)
  const redoStack = useStore(s => s._redoStack)
  const [showHelp, setShowHelp] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const settingsRef = useRef(null)

  const handleSignOut = () => {
    signOut()
    storeSignOut()
  }

  useEffect(() => {
    if (!showSettings) return
    const handleClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false)
    }
    const handleKey = (e) => { if (e.key === 'Escape') setShowSettings(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [showSettings])

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
          {/* Undo / Redo */}
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            title="Undo (Ctrl+Z)"
            className="p-2 rounded-lg transition-colors text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 010 10H9m-6-10l4-4m-4 4l4 4" />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Shift+Z)"
            className="p-2 rounded-lg transition-colors text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 000 10h4m6-10l-4-4m4 4l-4 4" />
            </svg>
          </button>

          {/* Settings gear */}
          <div className="relative" ref={settingsRef}>
            <button
              data-testid="settings-btn"
              onClick={() => setShowSettings(v => !v)}
              className={`p-2 rounded-lg transition-colors ${
                showSettings
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title="Settings"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {showSettings && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg py-1 min-w-[160px] z-50">
                <button
                  data-testid="demo-btn"
                  onClick={() => { setShowSettings(false); setShowDemoModal(true) }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    isDemoMode
                      ? 'text-amber-600 dark:text-amber-400 font-medium'
                      : 'text-zinc-700 dark:text-zinc-200'
                  } hover:bg-zinc-50 dark:hover:bg-zinc-700`}
                >
                  {isDemoMode ? 'Demo ●' : 'Demo'}
                </button>

                <button
                  data-testid="keyboard-help-btn"
                  onClick={() => { setShowSettings(false); setShowHelp(true) }}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  ? Shortcuts
                </button>

                <button
                  onClick={toggleTheme}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  {theme === 'dark' ? '☀ Light mode' : '🌙 Dark mode'}
                </button>
              </div>
            )}
          </div>

          {showHelp && <KeyboardShortcutsHelp onClose={() => setShowHelp(false)} />}

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
