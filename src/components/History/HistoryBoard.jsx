import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { snapshotToNodes, formatSnapshotCardTitle } from '../../utils/snapshotToNodes.js'
import NodeContent from '../Node/NodeContent.jsx'

export default function HistoryBoard() {
  const historyViewDate = useStore(s => s.historyViewDate)
  const history = useStore(s => s.history)
  const updateHistoryTask = useStore(s => s.updateHistoryTask)

  const snap = history.find(s => s.date === historyViewDate)
  if (!snap) return (
    <div className="max-w-screen-xl mx-auto px-4 py-12 text-center text-zinc-400 text-sm">
      No snapshot found for this date.
    </div>
  )

  const { nodes, rootOrder } = snapshotToNodes(snap)
  const cardId = rootOrder[0]
  const card = nodes[cardId]
  if (!card) return null

  return (
    <div data-testid="history-board" className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
        <HistoryCard
          nodes={nodes}
          cardId={cardId}
          title={formatSnapshotCardTitle(snap.date)}
          snapshotId={snap.id}
          updateHistoryTask={updateHistoryTask}
        />
      </div>
    </div>
  )
}

function HistoryCard({ nodes, cardId, title, snapshotId, updateHistoryTask }) {
  const card = nodes[cardId]
  if (!card) return null

  return (
    <div className="break-inside-avoid mb-4 rounded-2xl border border-amber-200 dark:border-amber-700 bg-white dark:bg-zinc-900 shadow-sm">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-amber-100 dark:border-amber-800/50">
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-100 flex-1">{title}</span>
        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Archived</span>
      </div>
      <div className="px-3 py-2 min-h-[40px]">
        {card.childrenIds.map(childId => (
          <HistoryNodeItem
            key={childId}
            nodeId={childId}
            nodes={nodes}
            depth={0}
            snapshotId={snapshotId}
            updateHistoryTask={updateHistoryTask}
          />
        ))}
        {card.childrenIds.length === 0 && (
          <p className="text-xs text-zinc-300 dark:text-zinc-700 py-1 px-1">No completed tasks</p>
        )}
      </div>
    </div>
  )
}

function HistoryNodeItem({ nodeId, nodes, depth, snapshotId, updateHistoryTask }) {
  const node = nodes[nodeId]
  const [isExpanded, setIsExpanded] = useState(true)

  if (!node) return null

  const isCompleted = node.status === 'COMPLETED'
  const hasChildren = node.childrenIds.length > 0

  return (
    <div style={{ paddingLeft: depth > 0 ? `${Math.min(depth * 16, 64)}px` : undefined }}>
      <div className="flex items-start gap-1.5 py-0.5 rounded-lg px-1 -mx-1 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors">
        {/* Expand toggle */}
        <button
          tabIndex={-1}
          onClick={() => hasChildren && setIsExpanded(v => !v)}
          className={`flex-shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center text-zinc-400 transition-transform ${
            hasChildren ? 'hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer' : 'opacity-0 cursor-default'
          } ${isExpanded ? '' : '-rotate-90'}`}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Checkbox */}
        <span className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center ${
          isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300 dark:border-zinc-600'
        }`}>
          {isCompleted && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>

        {/* Content — editable for typo fixes */}
        <div className="flex-1 min-w-0">
          <NodeContent
            content={node.content}
            onChange={(val) => updateHistoryTask(snapshotId, nodeId, val)}
            placeholder="Task…"
            className={`text-sm text-zinc-800 dark:text-zinc-100 leading-relaxed ${
              isCompleted ? 'line-through text-zinc-400 dark:text-zinc-600' : ''
            }`}
          />
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.childrenIds.map(childId => (
            <HistoryNodeItem
              key={childId}
              nodeId={childId}
              nodes={nodes}
              depth={depth + 1}
              snapshotId={snapshotId}
              updateHistoryTask={updateHistoryTask}
            />
          ))}
        </div>
      )}
    </div>
  )
}
