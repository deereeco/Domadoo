import { useStore } from '../store/useStore.js'

export default function DayCleanupModal() {
  const { pendingCleanupTasks, resolveCleanupTask, finalizeDayCleanup, lastCleanupDate } = useStore()

  if (!pendingCleanupTasks || pendingCleanupTasks.length === 0) return null

  const allResolved = pendingCleanupTasks.every(t => t.resolved !== null)

  const dateLabel = lastCleanupDate
    ? new Date(lastCleanupDate + 'T12:00:00').toLocaleDateString(undefined, {
        weekday: 'long', month: 'short', day: 'numeric',
      })
    : 'Yesterday'

  const handleApplyAll = (action) => {
    pendingCleanupTasks.forEach(t => {
      if (t.resolved === null) resolveCleanupTask(t.id, action)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dimmed backdrop — does not close modal (all tasks must be resolved first) */}
      <div className="flex-1 bg-black/20" />
      <div
        className="animate-slide-in-right bg-white dark:bg-zinc-900 w-full max-w-sm h-full border-l border-zinc-200 dark:border-zinc-700 shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-white">New day — unfinished tasks</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {dateLabel} had {pendingCleanupTasks.length} incomplete task{pendingCleanupTasks.length !== 1 ? 's' : ''}.
            What would you like to do?
          </p>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" data-testid="cleanup-task-list">
          {pendingCleanupTasks.map(task => (
            <div key={task.id} data-testid={`cleanup-task-${task.id}`} className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-3.5 h-3.5 mt-0.5 rounded border-2 border-zinc-400 flex-shrink-0" />
                <span className="text-sm text-zinc-800 dark:text-zinc-200 flex-1">{task.content || 'Untitled'}</span>
              </div>
              <div className="flex gap-2 ml-5">
                <button
                  onClick={() => resolveCleanupTask(task.id, 'today')}
                  title="Keep for today"
                  data-testid={`cleanup-action-today-${task.id}`}
                  className={`px-2 py-1 text-xs rounded-md font-medium transition-colors border ${
                    task.resolved === 'today'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  → Today
                </button>
                <button
                  onClick={() => resolveCleanupTask(task.id, 'complete')}
                  title="Mark as completed"
                  data-testid={`cleanup-action-complete-${task.id}`}
                  className={`px-2 py-1 text-xs rounded-md font-medium transition-colors border ${
                    task.resolved === 'complete'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  ✓ Done
                </button>
                <button
                  onClick={() => resolveCleanupTask(task.id, 'pushback')}
                  title="Return to original card"
                  data-testid={`cleanup-action-pushback-${task.id}`}
                  className={`px-2 py-1 text-xs rounded-md font-medium transition-colors border ${
                    task.resolved === 'pushback'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  ↩ Push back
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => handleApplyAll('today')}
              className="px-3 py-1.5 text-xs rounded-lg font-medium border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              All → Today
            </button>
            <button
              onClick={() => handleApplyAll('pushback')}
              className="px-3 py-1.5 text-xs rounded-lg font-medium border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              All ↩ Push back
            </button>
          </div>
          <button
            data-testid="cleanup-done-btn"
            onClick={finalizeDayCleanup}
            disabled={!allResolved}
            className={`px-4 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              allResolved
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
