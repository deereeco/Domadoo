import { useEffect } from 'react'
import { useStore } from '../store/useStore.js'

export default function DemoModal({ onClose }) {
  const {
    isDemoMode, enterDemoMode, exitDemoMode,
    todaysTasksRootId, nodes,
    initCleanupDate, runDailyCleanup,
    seedDemoTomorrowsTasks,
  } = useStore()

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleNextDay = () => {
    const tid = todaysTasksRootId
    if (tid && nodes[tid] && nodes[tid].childrenIds.length > 0) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      initCleanupDate(yesterday.toISOString().split('T')[0])
      runDailyCleanup()
    }
    onClose()
  }

  const handleNextWeek = () => {
    seedDemoTomorrowsTasks()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    initCleanupDate(sevenDaysAgo.toISOString().split('T')[0])
    runDailyCleanup()
    onClose()
  }

  return (
    <div
      data-testid="demo-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-zinc-200 dark:border-zinc-700 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-white">Demo Mode</h2>
            {isDemoMode && (
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                Demo active — your real data is hidden
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body: not in demo mode */}
        {!isDemoMode && (
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Demo mode loads sample tasks so you can explore features without affecting your real data.
              Your tasks are safely saved and restored when you exit.
            </p>
            <button
              data-testid="enter-demo-btn"
              onClick={enterDemoMode}
              className="w-full py-2.5 text-sm rounded-xl font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            >
              Enter Demo Mode
            </button>
          </div>
        )}

        {/* Body: in demo mode */}
        {isDemoMode && (
          <div className="px-6 py-5 space-y-4">
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide font-medium">
              Scenarios
            </p>

            <div
              data-testid="demo-scenario-nextday"
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">Next day →</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Simulates waking up the next morning. Unfinished tasks in Today's Tasks will
                  prompt the daily cleanup flow — carry forward, push back, or mark as done.
                </p>
              </div>
              <button
                onClick={handleNextDay}
                className="px-3 py-1.5 text-xs rounded-lg font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-80 transition-opacity"
              >
                Run scenario
              </button>
            </div>

            <div
              data-testid="demo-scenario-nextweek"
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">Next week →</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Seeds Tomorrow&apos;s Tasks and runs a weekly rollover — tomorrow&apos;s tasks move into Today&apos;s Tasks.
                </p>
              </div>
              <button
                onClick={handleNextWeek}
                className="px-3 py-1.5 text-xs rounded-lg font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-80 transition-opacity"
              >
                Run scenario
              </button>
            </div>

            <button
              data-testid="exit-demo-btn"
              onClick={() => { exitDemoMode(); onClose() }}
              className="w-full py-2 text-sm rounded-xl font-medium border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Exit Demo Mode
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
