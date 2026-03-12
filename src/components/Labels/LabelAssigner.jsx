import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store/useStore.js'

export default function LabelAssigner({ nodeId, onClose }) {
  const { labels, nodes, toggleLabelOnNode, todaysTasksLabelId } = useStore()
  const node = nodes[nodeId]
  const [search, setSearch] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtered = Object.values(labels).filter(l =>
    (!l.isSystem || l.id === todaysTasksLabelId) &&
    l.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      className="absolute z-50 top-full left-0 mt-1 w-52 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 py-2"
      onClick={e => e.stopPropagation()}
    >
      <div className="px-2 mb-1">
        <input
          ref={inputRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search labels…"
          className="w-full text-xs px-2 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 placeholder-zinc-400 outline-none"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-xs text-zinc-400 px-3 py-2">No labels found</p>
        )}
        {filtered.map(label => {
          const active = node?.labelIds.includes(label.id)
          return (
            <button
              key={label.id}
              onClick={() => toggleLabelOnNode(nodeId, label.id)}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-left"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: label.color }}
              />
              <span className="text-xs text-zinc-700 dark:text-zinc-200 flex-1 truncate">
                {label.name}
              </span>
              {active && (
                <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
