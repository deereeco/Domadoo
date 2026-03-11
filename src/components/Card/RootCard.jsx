import { useState, useRef, useCallback } from 'react'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../../store/useStore.js'
import NodeItem from '../Node/NodeItem.jsx'
import NodeContent from '../Node/NodeContent.jsx'

export default function RootCard({ nodeId }) {
  const node = useStore(s => s.nodes[nodeId])
  const { updateNodeContent, addChildNode, deleteNode, updateNode, dragMode } = useStore()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: nodeId,
    data: { type: 'card', nodeId },
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `card-drop-${nodeId}`,
    data: { type: 'card-body', cardId: nodeId },
  })

  const focusNode = useCallback((targetId) => {
    // Find the contenteditable in a node and focus it
    setTimeout(() => {
      const el = document.querySelector(`[data-nodeid="${targetId}"] [contenteditable]`)
      if (el) { el.focus(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r) }
    }, 20)
  }, [])

  if (!node) return null

  const isToday = node.isTodaysTask

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-nodeid={nodeId}
      {...(dragMode ? { ...attributes, ...listeners } : {})}
      className={`break-inside-avoid mb-4 rounded-2xl border transition-shadow ${
        isToday
          ? 'border-amber-300 dark:border-amber-600 bg-amber-50/60 dark:bg-amber-950/30'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
      } ${isOver ? 'ring-2 ring-indigo-400' : ''} shadow-sm hover:shadow-md ${dragMode ? 'cursor-grab select-none' : ''}`}
    >
      {/* Card Header */}
      <div
        {...(!dragMode ? { ...attributes, ...listeners } : {})}
        className={`flex items-center gap-2 px-4 pt-3 pb-2 border-b border-zinc-100 dark:border-zinc-800 touch-none ${dragMode ? 'pointer-events-none' : ''}`}
      >
        {isToday && (
          <span className="text-amber-500 text-xs font-semibold uppercase tracking-wide">Today</span>
        )}
        <NodeContent
          content={node.content}
          onChange={val => updateNodeContent(nodeId, val)}
          placeholder="Card title…"
          className="flex-1 text-sm font-semibold text-zinc-700 dark:text-zinc-100"
        />
        {/* Drag handle — visual indicator only */}
        <span className="flex-shrink-0 text-zinc-300 dark:text-zinc-600" aria-hidden="true">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
          </svg>
        </span>
        <button
          onClick={() => deleteNode(nodeId)}
          className="flex-shrink-0 text-zinc-300 dark:text-zinc-600 hover:text-red-400 transition-colors"
          tabIndex={-1}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Card Body */}
      <div ref={setDropRef} className={`px-3 py-2 min-h-[40px] ${dragMode ? 'pointer-events-none' : ''}`}>
        <SortableContext items={node.childrenIds} strategy={verticalListSortingStrategy}>
          {node.childrenIds.map(childId => (
            <NodeItem
              key={childId}
              nodeId={childId}
              parentId={nodeId}
              depth={0}
              focusNode={focusNode}
            />
          ))}
        </SortableContext>

        {node.childrenIds.length === 0 && (
          <p className="text-xs text-zinc-300 dark:text-zinc-700 py-1 px-1">
            {isToday ? 'Drag tasks here or press + to add' : 'Press + to add tasks'}
          </p>
        )}
      </div>

      {/* Add item button */}
      <div className={`px-4 pb-3 ${dragMode ? 'pointer-events-none' : ''}`}>
        <button
          onClick={() => addChildNode(nodeId)}
          className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
          </svg>
          Add item
        </button>
      </div>
    </div>
  )
}
