import { useStore } from '../store/useStore.js'

export default function DayCleanupModal() {
  const { pendingCleanupTasks, resolveCleanupTask, finalizeDayCleanup, lastCleanupDate } = useStore()

  if (!pendingCleanupTasks || pendingCleanupTasks.length === 0) return null

  const allResolved = pendingCleanupTasks.every(t => t.resolved !== null)

  const incompleteTasks = pendingCleanupTasks.filter(t => !t.isCompleted)
  const completedTasks = pendingCleanupTasks.filter(t => t.isCompleted)

  const dateLabel = lastCleanupDate
    ? new Date(lastCleanupDate + 'T12:00:00').toLocaleDateString(undefined, {
        weekday: 'long', month: 'short', day: 'numeric',
      })
    : 'Yesterday'

  const handleApplyAll = (action, completedOnly) => {
    pendingCleanupTasks.forEach(t => {
      if (t.resolved === null && t.isCompleted === completedOnly) {
        resolveCleanupTask(t.id, action)
      }
    })
  }

  const buildSubtitle = () => {
    const parts = []
    if (incompleteTasks.length > 0) parts.push(`${incompleteTasks.length} incomplete task${incompleteTasks.length !== 1 ? 's' : ''}`)
    if (completedTasks.length > 0) parts.push(`${completedTasks.length} completed task${completedTasks.length !== 1 ? 's' : ''}`)
    return `${dateLabel} had ${parts.join(' and ')}. What would you like to do?`
  }

  const buttonClass = (active) =>
    `px-2 py-1 text-xs rounded-md font-medium transition-colors border ${
      active
        ? 'bg-indigo-600 text-white border-indigo-600'
        : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
    }`

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
          <h2 className="font-semibold text-zinc-900 dark:text-white">New day — tasks to review</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{buildSubtitle()}</p>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" data-testid="cleanup-task-list">

          {/* Incomplete section */}
          {incompleteTasks.length > 0 && (
            <>
              {completedTasks.length > 0 && (
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400 pb-1">Incomplete</div>
              )}
              {incompleteTasks.map(task => (
                <div key={task.id} data-testid={`cleanup-task-${task.id}`} className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-3.5 h-3.5 mt-0.5 rounded border-2 border-zinc-400 flex-shrink-0" />
                    <span className="text-sm text-zinc-800 dark:text-zinc-200 flex-1">{task.content || 'Untitled'}</span>
                  </div>
                  <div className="flex gap-2 ml-5">
                    <button
                      onClick={() => resolveCleanupTask(task.id, 'today')}
                      title="Leave in today's list"
                      data-testid={`cleanup-action-today-${task.id}`}
                      className={buttonClass(task.resolved === 'today')}
                    >
                      Keep for today
                    </button>
                    <button
                      onClick={() => resolveCleanupTask(task.id, 'complete')}
                      title="Mark as done and archive to yesterday"
                      data-testid={`cleanup-action-complete-${task.id}`}
                      className={buttonClass(task.resolved === 'complete')}
                    >
                      Done (archive)
                    </button>
                    <button
                      onClick={() => resolveCleanupTask(task.id, 'pushback')}
                      title="Remove from today and return to its source card"
                      data-testid={`cleanup-action-pushback-${task.id}`}
                      className={buttonClass(task.resolved === 'pushback')}
                    >
                      Return to original card
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Completed section */}
          {completedTasks.length > 0 && (
            <>
              <div className={`text-xs font-semibold uppercase tracking-wide text-zinc-400 pb-1 ${incompleteTasks.length > 0 ? 'pt-2 border-t border-zinc-100 dark:border-zinc-800' : ''}`}>
                Completed
              </div>
              {completedTasks.map(task => (
                <div key={task.id} data-testid={`cleanup-task-${task.id}`} className="space-y-2">
                  <div className="flex items-start gap-2">
                    {/* Checked checkbox */}
                    <div className="w-3.5 h-3.5 mt-0.5 rounded border-2 border-green-500 bg-green-500 flex-shrink-0 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-sm text-zinc-400 dark:text-zinc-500 flex-1 line-through">{task.content || 'Untitled'}</span>
                  </div>
                  <div className="flex gap-2 ml-5">
                    <button
                      onClick={() => resolveCleanupTask(task.id, 'repeat')}
                      title="Reset to incomplete and keep in today's list"
                      data-testid={`cleanup-action-repeat-${task.id}`}
                      className={buttonClass(task.resolved === 'repeat')}
                    >
                      Repeat
                    </button>
                    <button
                      onClick={() => resolveCleanupTask(task.id, 'remove')}
                      title="Archive as completed and remove from today"
                      data-testid={`cleanup-action-remove-${task.id}`}
                      className={buttonClass(task.resolved === 'remove')}
                    >
                      Done (archive)
                    </button>
                    <button
                      onClick={() => resolveCleanupTask(task.id, 'pushback')}
                      title="Remove from today and return to its source card as incomplete"
                      data-testid={`cleanup-action-pushback-${task.id}`}
                      className={buttonClass(task.resolved === 'pushback')}
                    >
                      Return to original card
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {incompleteTasks.length > 0 && (
              <>
                <button
                  onClick={() => handleApplyAll('today', false)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  All: Keep for today
                </button>
                <button
                  onClick={() => handleApplyAll('pushback', false)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  All: Return to original card
                </button>
              </>
            )}
            {completedTasks.length > 0 && (
              <>
                <button
                  onClick={() => handleApplyAll('repeat', true)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  All: Repeat
                </button>
                <button
                  onClick={() => handleApplyAll('remove', true)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  All: Done (archive)
                </button>
              </>
            )}
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
