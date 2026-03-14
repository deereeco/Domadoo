import { useState, useRef, useCallback } from 'react'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../../store/useStore.js'
import NodeItem from '../Node/NodeItem.jsx'
import NodeContent from '../Node/NodeContent.jsx'

export default function RootCard({ nodeId }) {
  const node = useStore(s => s.nodes[nodeId])
  const { updateNodeContent, addChildNode, deleteNode, updateNode, dragMode,
          toggleLabelOnNode, todaysTasksLabelId, tomorrowsTasksLabelId,
          collapsedCards, toggleCardCollapse,
          pinnedCards, toggleCardPin,
          openDetailsModal } = useStore()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: nodeId,
    data: { type: 'card', nodeId },
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `card-drop-${nodeId}`,
    data: { type: 'card-body', cardId: nodeId },
  })

  const headerRef = useRef(null)
  const isCollapsed = !!collapsedCards[nodeId]
  const isPinned = !!pinnedCards[nodeId]

  const focusNode = useCallback((targetId) => {
    // Find the contenteditable in a node and focus it
    setTimeout(() => {
      const el = document.querySelector(`[data-nodeid="${targetId}"] [contenteditable]`)
      if (el) { el.focus(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r) }
    }, 20)
  }, [])

  if (!node) return null

  const isToday = node.isTodaysTask
  const isTomorrow = node.isTomorrowsTask
  const hasTodayLabel = node.labelIds?.includes(todaysTasksLabelId)
  const hasTomorrowLabel = node.labelIds?.includes(tomorrowsTasksLabelId)

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
      data-testid={isToday ? 'today-tasks-card' : isTomorrow ? 'tomorrow-tasks-card' : `card-${nodeId}`}
      className={`break-inside-avoid mb-4 rounded-2xl border transition-shadow ${
        isToday
          ? 'border-amber-300 dark:border-amber-600 bg-amber-50/60 dark:bg-amber-950/30'
          : isTomorrow
            ? 'border-blue-300 dark:border-blue-700 bg-blue-50/60 dark:bg-blue-950/30'
            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
      } ${isOver ? 'ring-2 ring-indigo-400' : ''} shadow-sm hover:shadow-md`}
    >
      {/* Card Header — listeners scoped to drag handle icon so touch-none doesn't block pinch zoom on the title */}
      <div
        {...attributes}
        ref={headerRef}
        data-testid={`card-header-${nodeId}`}
        onKeyDown={(e) => {
          if (e.target.contentEditable === 'true') return
          const CARD_SEL = '[data-testid^="card-"]:not([data-testid^="card-h"]):not([data-testid="card-list"])'

          // Tab / Shift+Tab — jump to next/prev card header
          if (e.key === 'Tab') {
            e.preventDefault()
            const cards = [...document.querySelectorAll(CARD_SEL)]
            const cardEl = e.currentTarget.closest(CARD_SEL)
            const cardIdx = cards.indexOf(cardEl)
            const target = e.shiftKey ? cards[cardIdx - 1] : cards[cardIdx + 1]
            target?.querySelector('[data-testid^="card-header-"]')?.focus()
            return
          }

          // ↓ — focus first task in this card
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            const cardEl = e.currentTarget.closest(CARD_SEL)
            cardEl?.querySelector('[data-testid^="node-"]:not([data-testid^="node-handle-"])')?.focus()
            return
          }

          // ↑ — focus last task in previous card (or prev card header if empty)
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            const cards = [...document.querySelectorAll(CARD_SEL)]
            const cardEl = e.currentTarget.closest(CARD_SEL)
            const prevCard = cards[cards.indexOf(cardEl) - 1]
            if (prevCard) {
              const prevNodes = [...prevCard.querySelectorAll('[data-testid^="node-"]:not([data-testid^="node-handle-"])')]
              if (prevNodes.length) prevNodes[prevNodes.length - 1].focus()
              else prevCard.querySelector('[data-testid^="card-header-"]')?.focus()
            }
            return
          }

          // Enter — focus title contentEditable
          if (e.key === 'Enter') {
            e.preventDefault()
            const ce = headerRef.current?.querySelector('[contenteditable]')
            if (ce) { ce.focus(); const r = document.createRange(); r.selectNodeContents(ce); r.collapse(false); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r) }
          }
        }}
        className={`flex items-center gap-2 px-4 pt-3 pb-2 border-b border-zinc-100 dark:border-zinc-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:rounded-t-xl ${dragMode ? 'cursor-grab select-none' : ''}`}
      >
        {/* In drag mode, block interactive children so tap-to-drag works cleanly */}
        <div className={`flex items-center gap-2 flex-1 min-w-0 ${dragMode ? 'pointer-events-none' : 'contents'}`}>
          {isToday && (
            <span className="text-amber-500 text-xs font-semibold uppercase tracking-wide">Today</span>
          )}
          {isTomorrow && (
            <span className="text-blue-500 text-xs font-semibold uppercase tracking-wide">Tomorrow</span>
          )}
          <NodeContent
            content={node.content}
            onChange={val => updateNodeContent(nodeId, val)}
            placeholder="Card title…"
            className="flex-1 text-sm font-semibold text-zinc-700 dark:text-zinc-100"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                e.currentTarget.blur()
                headerRef.current?.focus()
              }
            }}
          />
          {/* Drag handle — touch-none scoped here so pinch zoom works on card title area */}
          <span {...listeners} data-testid={`card-handle-${nodeId}`} className="flex-shrink-0 text-zinc-300 dark:text-zinc-600 touch-none" style={{ pointerEvents: 'auto' }} aria-hidden="true">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
              <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
              <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
            </svg>
          </span>

          {/* Pin button */}
          <button
            onClick={() => toggleCardPin(nodeId)}
            className={`flex-shrink-0 transition-colors ${isPinned ? 'text-indigo-400' : 'text-zinc-300 dark:text-zinc-600 hover:text-indigo-400'}`}
            title={isPinned ? 'Unpin card' : 'Pin card to top'}
            tabIndex={-1}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
            </svg>
          </button>

          {/* Open details button */}
          <button
            onClick={() => openDetailsModal(nodeId)}
            className="flex-shrink-0 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors"
            title="Open details"
            tabIndex={-1}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => toggleCardCollapse(nodeId)}
            className="flex-shrink-0 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors"
            title={isCollapsed ? 'Expand card' : 'Collapse card'}
            tabIndex={-1}
          >
            <svg className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {!isToday && !isTomorrow && todaysTasksLabelId && (
            <button
              data-testid={`today-toggle-card-${nodeId}`}
              onClick={() => toggleLabelOnNode(nodeId, todaysTasksLabelId)}
              className={`flex-shrink-0 transition-colors ${hasTodayLabel ? 'text-amber-400' : 'text-zinc-300 dark:text-zinc-600 hover:text-amber-400'}`}
              title={hasTodayLabel ? 'Remove from Today\'s Tasks' : 'Add to Today\'s Tasks'}
              tabIndex={-1}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="4" strokeWidth={2} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </button>
          )}
          {!isToday && !isTomorrow && tomorrowsTasksLabelId && (
            <button
              data-testid={`tomorrow-toggle-card-${nodeId}`}
              onClick={() => toggleLabelOnNode(nodeId, tomorrowsTasksLabelId)}
              className={`flex-shrink-0 transition-colors ${hasTomorrowLabel ? 'text-blue-400' : 'text-zinc-300 dark:text-zinc-600 hover:text-blue-400'}`}
              title={hasTomorrowLabel ? "Remove from Tomorrow's Tasks" : "Add to Tomorrow's Tasks"}
              tabIndex={-1}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            </button>
          )}
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
      </div>

      {/* Card Body — hidden when collapsed */}
      {!isCollapsed && (
        <>
          <div ref={setDropRef} className="px-3 py-2 min-h-[40px]">
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
                {isToday ? 'Drag tasks here or press + to add' : isTomorrow ? 'Queue tasks here for tomorrow' : 'Press + to add tasks'}
              </p>
            )}
          </div>

          {/* Add item button */}
          <div className={`px-4 pb-3 ${dragMode ? 'pointer-events-none' : ''}`}>
            <button
              tabIndex={-1}
              data-testid={`add-item-${nodeId}`}
              onClick={() => addChildNode(nodeId)}
              className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
              </svg>
              Add item
            </button>
          </div>
        </>
      )}
    </div>
  )
}
