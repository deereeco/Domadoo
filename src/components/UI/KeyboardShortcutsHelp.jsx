import { useEffect, useRef } from 'react'

const SHORTCUTS = [
  { ctx: 'Navigate', key: 'Tab', action: 'Next field' },
  { ctx: 'Navigate', key: 'Shift+Tab', action: 'Previous field' },
  { ctx: 'Navigate', key: 'Enter', action: 'Start editing' },
  { ctx: 'Navigate', key: 'Space', action: 'Toggle checkbox' },
  { ctx: 'Navigate', key: 'Ctrl+D', action: 'Open details' },
  { ctx: 'Navigate', key: 'Ctrl+L', action: 'Assign label' },
  { ctx: 'Editing', key: 'Escape', action: 'Stop editing' },
  { ctx: 'Editing', key: 'Enter', action: 'Add task below' },
  { ctx: 'Editing', key: 'Tab', action: 'Indent task' },
  { ctx: 'Editing', key: 'Shift+Tab', action: 'Outdent task' },
  { ctx: 'Editing', key: 'Backspace (empty)', action: 'Delete task' },
  { ctx: 'Global', key: 'Ctrl+Shift+N', action: 'New card' },
]

export default function KeyboardShortcutsHelp({ onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Close on click outside
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      data-testid="keyboard-help-popover"
      className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl p-4 w-72"
    >
      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wide">Keyboard shortcuts</p>
      <table className="w-full text-xs border-collapse">
        <tbody>
          {SHORTCUTS.map(({ ctx, key, action }) => (
            <tr key={`${ctx}-${key}`} data-testid="shortcut-row" className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
              <td className="py-1 pr-2 text-zinc-400 dark:text-zinc-500 whitespace-nowrap">{ctx}</td>
              <td className="py-1 pr-2">
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-zinc-700 dark:text-zinc-300 text-[10px]">{key}</kbd>
              </td>
              <td className="py-1 text-zinc-600 dark:text-zinc-300">{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
