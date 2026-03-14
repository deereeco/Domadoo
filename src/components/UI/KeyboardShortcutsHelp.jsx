import { useEffect, useRef } from 'react'

const SHORTCUTS = {
  'Esc':        { label: 'Stop editing', ctx: 'Editing' },
  'Tab':        { label: 'Indent / next card', ctx: 'Editing / Navigate' },
  'Enter':      { label: 'Add task / start edit', ctx: 'Editing / Navigate' },
  'Space':      { label: 'Toggle checkbox', ctx: 'Navigate' },
  'Backspace':  { label: 'Delete empty task', ctx: 'Editing' },
  '↑':          { label: 'Prev task', ctx: 'Navigate' },
  '↓':          { label: 'Next task', ctx: 'Navigate' },
  '←':          { label: 'Collapse / parent', ctx: 'Navigate' },
  '→':          { label: 'Expand / enter', ctx: 'Navigate' },
  'D':          { label: 'Open details', ctx: 'Ctrl+D' },
  'L':          { label: 'Assign label', ctx: 'Ctrl+L' },
  'N':          { label: 'New card', ctx: 'Ctrl+Shift+N' },
}

const KEYBOARD_ROWS = [
  ['Esc', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
  ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'],
  ['Ctrl', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', 'Enter'],
  ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Shift'],
  ['Space'],
]

// Wide keys
const WIDE_KEYS = new Set(['Backspace', 'Tab', 'Ctrl', 'Enter', 'Shift', 'Space'])

// Arrow key pseudo-row (rendered separately)
const ARROW_KEYS = ['↑', '↓', '←', '→']

export default function KeyboardShortcutsHelp({ onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        ref={ref}
        data-testid="keyboard-help-popover"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Keyboard Shortcuts</p>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Visual keyboard */}
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-4 mb-5 overflow-x-auto">
          <div className="flex flex-col gap-1 min-w-[540px]">
            {KEYBOARD_ROWS.map((row, rowIdx) => (
              <div key={rowIdx} className="flex gap-1">
                {row.map(key => {
                  const shortcut = SHORTCUTS[key]
                  const isActive = !!shortcut
                  const isWide = WIDE_KEYS.has(key)
                  return (
                    <div
                      key={key}
                      className={`relative flex flex-col items-center justify-center rounded-lg border text-[10px] font-mono font-semibold select-none transition-colors
                        ${isWide ? 'px-2 min-w-[52px]' : 'w-9'}
                        h-9
                        ${isActive
                          ? 'bg-indigo-500 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900'
                          : 'bg-white dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 border-zinc-300 dark:border-zinc-600'
                        }`}
                      title={isActive ? `${shortcut.ctx}: ${shortcut.label}` : undefined}
                    >
                      {key}
                    </div>
                  )
                })}
              </div>
            ))}
            {/* Arrow keys */}
            <div className="flex gap-1 mt-1 ml-auto mr-4">
              {ARROW_KEYS.map(key => {
                const shortcut = SHORTCUTS[key]
                const isActive = !!shortcut
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-center w-9 h-9 rounded-lg border text-[10px] font-mono font-semibold select-none
                      ${isActive
                        ? 'bg-indigo-500 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900'
                        : 'bg-white dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 border-zinc-300 dark:border-zinc-600'
                      }`}
                    title={isActive ? `${shortcut.ctx}: ${shortcut.label}` : undefined}
                  >
                    {key}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3 font-medium uppercase tracking-wide">Highlighted keys</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[...Object.entries(SHORTCUTS), ...ARROW_KEYS.map(k => [k, SHORTCUTS[k]])].filter(([, v]) => v).map(([key, { ctx, label }]) => (
            <div key={key} className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-semibold min-w-[32px] text-center">{key}</kbd>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{ctx !== key ? `${ctx} — ` : ''}{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
