import { useStore } from '../../store/useStore.js'

export default function FilterBar() {
  const { labels, activeFilters, setFilter, clearFilters, nodes } = useStore()

  // Only show labels that are actually used on some node
  const usedLabelIds = new Set()
  Object.values(nodes).forEach(n => n.labelIds.forEach(id => usedLabelIds.add(id)))
  const usedLabels = Object.values(labels).filter(l => usedLabelIds.has(l.id))

  if (usedLabels.length === 0) return null

  const hasActiveFilters = Object.values(activeFilters).some(v => v !== null)

  return (
    <div className="sticky top-14 z-30 bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 px-4 py-2">
      <div className="max-w-screen-xl mx-auto flex items-center gap-2 flex-wrap">
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
      </div>
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
