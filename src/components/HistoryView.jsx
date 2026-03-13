import { useState, useMemo, useRef } from 'react'
import { useStore } from '../store/useStore.js'

const PRESETS = [
  { label: 'Yesterday', key: 'yesterday' },
  { label: 'Last 7 days', key: 'week' },
  { label: 'Last 30 days', key: 'month' },
  { label: 'Custom', key: 'custom' },
]

function getPresetRange(key) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (key === 'yesterday') {
    const d = new Date(today); d.setDate(d.getDate() - 1)
    return { from: d.toISOString().split('T')[0], to: d.toISOString().split('T')[0] }
  }
  if (key === 'week') {
    const d = new Date(today); d.setDate(d.getDate() - 6)
    return { from: d.toISOString().split('T')[0], to: today.toISOString().split('T')[0] }
  }
  if (key === 'month') {
    const d = new Date(today); d.setDate(d.getDate() - 29)
    return { from: d.toISOString().split('T')[0], to: today.toISOString().split('T')[0] }
  }
  return null
}

function formatDayHeader(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function EditableTask({ task, snapshotId, depth = 0 }) {
  const { updateHistoryTask } = useStore()
  const ref = useRef(null)

  const handleBlur = () => {
    const newContent = ref.current?.innerText?.trim() ?? ''
    if (newContent !== task.content) {
      updateHistoryTask(snapshotId, task.id, newContent)
    }
  }

  return (
    <li>
      <div className="flex items-start gap-2 group">
        <div className="w-3.5 h-3.5 mt-0.5 rounded border-2 border-emerald-500 bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ref.current?.blur() } }}
          className="text-sm text-zinc-500 dark:text-zinc-400 line-through flex-1 outline-none rounded px-0.5 -mx-0.5 focus:bg-zinc-100 dark:focus:bg-zinc-800 cursor-text break-words min-w-0"
        >
          {task.content || ''}
        </div>
      </div>
      {task.children?.length > 0 && (
        <TaskTree tasks={task.children} snapshotId={snapshotId} depth={depth + 1} />
      )}
    </li>
  )
}

function TaskTree({ tasks, snapshotId, depth = 0 }) {
  return (
    <ul className={depth === 0 ? 'space-y-1' : 'mt-1 space-y-1 ml-4'}>
      {tasks.map(task => (
        <EditableTask key={task.id} task={task} snapshotId={snapshotId} depth={depth} />
      ))}
    </ul>
  )
}

export default function HistoryView() {
  const { history, setShowHistory } = useStore()
  const [preset, setPreset] = useState('yesterday')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const range = useMemo(() => {
    if (preset !== 'custom') return getPresetRange(preset)
    if (customFrom && customTo) return { from: customFrom, to: customTo }
    return null
  }, [preset, customFrom, customTo])

  const filtered = useMemo(() => {
    if (!range) return []
    return [...history]
      .filter(s => s.date >= range.from && s.date <= range.to)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [history, range])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={() => setShowHistory(false)}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg border border-zinc-200 dark:border-zinc-700 max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-white">History</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Completed tasks from past days</p>
          </div>
          <button
            onClick={() => setShowHistory(false)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preset filters */}
        <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 flex gap-2 flex-wrap">
          {PRESETS.map(p => (
            <button
              key={p.key}
              data-testid={`history-preset-${p.key}`}
              onClick={() => setPreset(p.key)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                preset === p.key
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom range inputs */}
        {preset === 'custom' && (
          <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 flex gap-3 items-center">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">From</label>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="text-xs border border-zinc-300 dark:border-zinc-600 rounded-lg px-2 py-1 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
            />
            <label className="text-xs text-zinc-500 dark:text-zinc-400">To</label>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="text-xs border border-zinc-300 dark:border-zinc-600 rounded-lg px-2 py-1 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
            />
          </div>
        )}

        {/* History list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6" data-testid="history-list">
          {filtered.length === 0 && (
            <p className="text-sm text-zinc-400 dark:text-zinc-600 text-center py-8">
              No completed tasks found for this period.
            </p>
          )}
          {filtered.map(snapshot => (
            <div key={snapshot.id}>
              <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
                {formatDayHeader(snapshot.date)}
              </h3>
              {snapshot.tasks.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-600 ml-1">No completed tasks.</p>
              ) : (
                <TaskTree tasks={snapshot.tasks} snapshotId={snapshot.id} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
