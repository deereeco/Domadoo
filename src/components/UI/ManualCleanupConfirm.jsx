import { useEffect, useRef } from 'react'
import { useStore } from '../../store/useStore.js'

export default function ManualCleanupConfirm({ onClose }) {
  const { nodes, tomorrowsTasksRootId, runDailyCleanup } = useStore()
  const overlayRef = useRef(null)

  const tomorrowCard = tomorrowsTasksRootId ? nodes[tomorrowsTasksRootId] : null
  const tomorrowTasks = (tomorrowCard?.childrenIds ?? [])
    .map(id => nodes[id])
    .filter(Boolean)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleInclude = () => {
    runDailyCleanup({ manual: true, includeTomorrow: true })
    onClose()
  }

  const handleSkip = () => {
    runDailyCleanup({ manual: true, includeTomorrow: false })
    onClose()
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 border border-zinc-200 dark:border-zinc-700">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">🧹 Cleanup Now</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          Tomorrow's Tasks has {tomorrowTasks.length} item{tomorrowTasks.length !== 1 ? 's' : ''}:
        </p>

        <ul className="mb-5 space-y-1 max-h-48 overflow-y-auto">
          {tomorrowTasks.map(task => (
            <li key={task.id} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
              <span className="mt-0.5 text-zinc-400">•</span>
              <span>{task.content || <em className="text-zinc-400">Untitled</em>}</span>
            </li>
          ))}
        </ul>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
          Roll them into Today's Tasks now, or skip and only triage existing Today's tasks.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleInclude}
            className="w-full py-2 px-4 rounded-xl text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors"
          >
            Include Tomorrow's Tasks
          </button>
          <button
            onClick={handleSkip}
            className="w-full py-2 px-4 rounded-xl text-sm font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors"
          >
            Today's Tasks Only
          </button>
          <button
            onClick={onClose}
            className="w-full py-1.5 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
