import { useStore } from '../store/useStore.js'

export default function DoneTodayView() {
  const { nodes, setShowDoneToday, toggleComplete } = useStore()
  const today = new Date().toDateString()

  const doneTodayNodes = Object.values(nodes).filter(n =>
    n.status === 'COMPLETED' && n.completedAt && new Date(n.completedAt).toDateString() === today
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={() => setShowDoneToday(false)}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-zinc-200 dark:border-zinc-700 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-white">Done Today</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{doneTodayNodes.length} task{doneTodayNodes.length !== 1 ? 's' : ''} completed</p>
          </div>
          <button
            onClick={() => setShowDoneToday(false)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {doneTodayNodes.length === 0 && (
            <p className="text-sm text-zinc-400 dark:text-zinc-600 text-center py-8">
              No tasks completed today yet.<br />
              <span className="text-xs">Check off some tasks to see them here!</span>
            </p>
          )}
          {doneTodayNodes.map(node => (
            <div key={node.id} className="flex items-center gap-3 py-1.5 group">
              <div className="w-4 h-4 rounded border-2 border-emerald-500 bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="flex-1 text-sm text-zinc-500 dark:text-zinc-400 line-through">
                {node.content || 'Untitled'}
              </span>
              <button
                onClick={() => toggleComplete(node.id)}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Undo
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
