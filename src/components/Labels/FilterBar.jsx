import { useStore } from '../../store/useStore.js'
import { formatSnapshotDateLabel, formatSnapshotCardTitle } from '../../utils/snapshotToNodes.js'

export default function FilterBar() {
  const {
    labels, activeFilters, setFilter, clearFilters, nodes, history, historyViewDate, setHistoryViewDate,
    setShowLabelManager, toggleTodaysTasksCard, todaysTasksRootId, toggleTomorrowsTasksCard, tomorrowsTasksRootId, rootOrder,
  } = useStore()

  // Only show labels that are actually used on some node
  const usedLabelIds = new Set()
  Object.values(nodes).forEach(n => n.labelIds.forEach(id => usedLabelIds.add(id)))
  const usedLabels = Object.values(labels).filter(l => usedLabelIds.has(l.id))

  const hasActiveFilters = Object.values(activeFilters).some(v => v !== null)

  // Sort history newest-first for dropdown
  const sortedHistory = [...history].sort((a, b) => b.date.localeCompare(a.date))

  const todaysTasksVisible = todaysTasksRootId && rootOrder.includes(todaysTasksRootId)
  const tomorrowsTasksVisible = tomorrowsTasksRootId && rootOrder.includes(tomorrowsTasksRootId)

  return (
    <div className="sticky top-14 z-30 bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-center gap-2 flex-wrap">

        {/* Labels button */}
        <button
          onClick={() => setShowLabelManager(true)}
          className="px-2.5 py-1 text-xs rounded-lg font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700"
        >
          Labels
        </button>

        {/* Toggle Today's Tasks button */}
        <button
          onClick={toggleTodaysTasksCard}
          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors border ${
            todaysTasksVisible
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-300 dark:border-amber-700'
              : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
          }`}
          title={todaysTasksVisible ? "Hide Today's Tasks card" : "Show Today's Tasks card"}
        >
          Today's Tasks
        </button>

        {/* Toggle Tomorrow's Tasks button */}
        <button
          data-testid="toggle-tomorrows-tasks"
          onClick={toggleTomorrowsTasksCard}
          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors border ${
            tomorrowsTasksVisible
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-300 dark:border-blue-700'
              : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
          }`}
          title={tomorrowsTasksVisible ? "Hide Tomorrow's Tasks card" : "Show Tomorrow's Tasks card"}
        >
          Tomorrow's Tasks
        </button>

        {usedLabels.length > 0 && (
          <>
            <span className="text-zinc-200 dark:text-zinc-700 mx-1 select-none">|</span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mr-1">Filter:</span>
            {usedLabels.map(label => {
              const mode = activeFilters[label.id] ?? null
              return (
                <FilterChip
                  key={label.id}
                  label={label}
                  mode={mode}
                  onToggle={(nextMode) => setFilter(label.id, nextMode)}
                />
              )
            })}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 px-2 py-0.5"
              >
                Clear
              </button>
            )}
          </>
        )}

        {sortedHistory.length > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            {usedLabels.length > 0 && (
              <span className="text-zinc-200 dark:text-zinc-700 mx-1 select-none">|</span>
            )}
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">View:</span>
            <select
              data-testid="history-date-select"
              value={historyViewDate ?? ''}
              onChange={e => setHistoryViewDate(e.target.value || null)}
              className="text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
            >
              <option value="">Today</option>
              {sortedHistory.map(snap => (
                <option key={snap.date} value={snap.date}>
                  {formatSnapshotDateLabel(snap.date)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {historyViewDate && (
        <div className="border-t border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-1.5">
          <p className="max-w-screen-xl mx-auto text-xs text-amber-700 dark:text-amber-400">
            Viewing {formatSnapshotCardTitle(historyViewDate)} — read-only (text still editable for typo fixes)
          </p>
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, mode, onToggle }) {
  const cycleMode = () => {
    if (mode === null) onToggle('show')
    else if (mode === 'show') onToggle('hide')
    else onToggle(null)
  }

  const baseStyle = 'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer transition-all select-none'

  if (mode === 'show') {
    return (
      <span
        className={`${baseStyle} ring-2`}
        style={{ backgroundColor: label.color + '22', color: label.color, ringColor: label.color }}
        onClick={cycleMode}
        title="Showing — click to hide"
      >
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
        {label.name}
        <span className="text-[10px] opacity-70">show</span>
      </span>
    )
  }

  if (mode === 'hide') {
    return (
      <span
        className={`${baseStyle} line-through opacity-60 bg-zinc-100 dark:bg-zinc-800 text-zinc-400`}
        onClick={cycleMode}
        title="Hidden — click to clear"
      >
        {label.name}
        <span className="text-[10px]">hide</span>
      </span>
    )
  }

  return (
    <span
      className={`${baseStyle} bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700`}
      onClick={cycleMode}
      title="Click to show only this label"
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
      {label.name}
    </span>
  )
}
