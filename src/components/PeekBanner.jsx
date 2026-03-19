import { useStore } from '../store/useStore.js'

export default function PeekBanner() {
  const { pendingCleanupTasks, exitPeekMode } = useStore()

  const remaining = pendingCleanupTasks?.filter(t => t.resolved === null).length ?? 0

  return (
    <div data-testid="peek-banner" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-200 dark:shadow-amber-900/50 whitespace-nowrap">
      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <span className="text-sm font-medium">Finish cleanup to edit the board</span>
      <button
        data-testid="peek-resume-btn"
        onClick={exitPeekMode}
        className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold transition-colors"
      >
        Resume
        {remaining > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/30 text-xs">{remaining}</span>}
      </button>
    </div>
  )
}
