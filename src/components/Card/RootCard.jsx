import { useState, useRef, useCallback, useEffect } from 'react'
import { flushSync, createPortal } from 'react-dom'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../../store/useStore.js'
import NodeItem from '../Node/NodeItem.jsx'
import NodeContent from '../Node/NodeContent.jsx'
import LabelAssigner from '../Labels/LabelAssigner.jsx'

export default function RootCard({ nodeId, peekLocked = false }) {
  const node = useStore(s => s.nodes[nodeId])
  const { updateNodeContent, addChildNode, deleteNode, updateNode, dragMode,
          toggleLabelOnNode, todaysTasksLabelId, tomorrowsTasksLabelId,
          collapsedCards, toggleCardCollapse,
          pinnedCards, toggleCardPin,
          openDetailsModal } = useStore()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: nodeId,
    data: { type: 'card', nodeId },
    disabled: peekLocked,
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `card-drop-${nodeId}`,
    data: { type: 'card-body', cardId: nodeId },
  })

  const headerRef = useRef(null)
  const cardMenuBtnRef = useRef(null)
  const cardMenuDropdownRef = useRef(null)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [showCardMenu, setShowCardMenu] = useState(false)
  const [cardMenuPos, setCardMenuPos] = useState(null)
  const [showLabelAssigner, setShowLabelAssigner] = useState(false)
  const isCollapsed = !!collapsedCards[nodeId]
  const isPinned = !!pinnedCards[nodeId]

  useEffect(() => {
    if (!pendingDelete) return
    const handler = (e) => { if (e.key === 'Escape') setPendingDelete(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [pendingDelete])

  useEffect(() => {
    if (!showCardMenu) return
    const handler = (e) => {
      if (!cardMenuBtnRef.current?.contains(e.target) && !cardMenuDropdownRef.current?.contains(e.target)) setShowCardMenu(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [showCardMenu])

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
      className={`relative break-inside-avoid mb-4 rounded-2xl border transition-shadow ${
        isToday
          ? 'border-amber-300 dark:border-amber-600 bg-amber-50/60 dark:bg-amber-950/30'
          : isTomorrow
            ? 'border-blue-300 dark:border-blue-700 bg-blue-50/60 dark:bg-blue-950/30'
            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
      } ${isOver ? 'ring-2 ring-indigo-400' : ''} shadow-sm hover:shadow-md ${peekLocked ? 'opacity-60' : ''}`}
    >
      {/* Peek mode overlay — blocks all interaction on existing cards */}
      {peekLocked && <div className="absolute inset-0 z-10 rounded-2xl cursor-not-allowed" />}

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

          // → — focus next card header
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            const cards = [...document.querySelectorAll(CARD_SEL)]
            const cardEl = e.currentTarget.closest(CARD_SEL)
            const cardIdx = cards.indexOf(cardEl)
            cards[cardIdx + 1]?.querySelector('[data-testid^="card-header-"]')?.focus()
            return
          }

          // ← — focus prev card header
          if (e.key === 'ArrowLeft') {
            e.preventDefault()
            const cards = [...document.querySelectorAll(CARD_SEL)]
            const cardEl = e.currentTarget.closest(CARD_SEL)
            const cardIdx = cards.indexOf(cardEl)
            cards[cardIdx - 1]?.querySelector('[data-testid^="card-header-"]')?.focus()
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
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const targetId = node.childrenIds.length > 0
                    ? node.childrenIds[0]
                    : (() => { let id; flushSync(() => { id = addChildNode(nodeId) }); return id })()
                  const el = document.querySelector(`[data-nodeid="${targetId}"] [contenteditable]`)
                  if (el) { el.focus(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r) }
                }
                if (e.key === 'Backspace' && e.currentTarget.textContent === '') {
                  e.preventDefault()
                  setPendingDelete(true)
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

          {/* Overflow menu */}
          <div className={`relative flex-shrink-0 ${showLabelAssigner ? 'z-50' : ''}`}>
            <button
              ref={cardMenuBtnRef}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (!showCardMenu && cardMenuBtnRef.current) {
                  const rect = cardMenuBtnRef.current.getBoundingClientRect()
                  setCardMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                }
                setShowCardMenu(v => !v)
              }}
              className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors p-0.5 rounded"
              title="Actions"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
              </svg>
            </button>

            {showLabelAssigner && (
              <LabelAssigner nodeId={nodeId} onClose={() => setShowLabelAssigner(false)} />
            )}
          </div>

          {showCardMenu && cardMenuPos && createPortal(
            <div
              ref={cardMenuDropdownRef}
              style={{ position: 'fixed', top: cardMenuPos.top, right: cardMenuPos.right, zIndex: 9999 }}
              className="w-48 rounded-lg shadow-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 py-1"
            >
              <button
                tabIndex={-1}
                onClick={() => { addChildNode(nodeId); setShowCardMenu(false) }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
                </svg>
                Add item
              </button>

              <button
                tabIndex={-1}
                onClick={() => { setShowCardMenu(false); setShowLabelAssigner(true) }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Label
              </button>

              <button
                tabIndex={-1}
                onClick={() => { openDetailsModal(nodeId); setShowCardMenu(false) }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
                Details
              </button>

              {!isToday && !isTomorrow && todaysTasksLabelId && (
                <button
                  tabIndex={-1}
                  data-testid={`today-toggle-card-${nodeId}`}
                  onClick={() => { toggleLabelOnNode(nodeId, todaysTasksLabelId); setShowCardMenu(false) }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left"
                >
                  <svg className={`w-3.5 h-3.5 flex-shrink-0 ${hasTodayLabel ? 'text-amber-400' : 'text-amber-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="4" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                  {hasTodayLabel ? "Remove from Today's" : "Add to Today's"}
                </button>
              )}

              {!isToday && !isTomorrow && tomorrowsTasksLabelId && (
                <button
                  tabIndex={-1}
                  data-testid={`tomorrow-toggle-card-${nodeId}`}
                  onClick={() => { toggleLabelOnNode(nodeId, tomorrowsTasksLabelId); setShowCardMenu(false) }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left"
                >
                  <svg className={`w-3.5 h-3.5 flex-shrink-0 ${hasTomorrowLabel ? 'text-blue-400' : 'text-blue-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                  {hasTomorrowLabel ? "Remove from Tomorrow's" : "Add to Tomorrow's"}
                </button>
              )}

              <div className="my-1 border-t border-zinc-100 dark:border-zinc-700" />

              <button
                tabIndex={-1}
                onClick={() => { setShowCardMenu(false); setPendingDelete(true) }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 w-full text-left"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete card
              </button>
            </div>,
            document.body
          )}
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

      {pendingDelete && (
        <div
          data-testid="delete-card-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setPendingDelete(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm border border-zinc-200 dark:border-zinc-700 p-6 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-white">Delete card?</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                This will permanently delete &ldquo;{node.content}&rdquo; and all its tasks.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                data-testid="delete-card-cancel"
                onClick={() => setPendingDelete(false)}
                className="px-4 py-2 text-sm rounded-xl font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                data-testid="delete-card-confirm"
                autoFocus
                onClick={() => deleteNode(nodeId)}
                className="px-4 py-2 text-sm rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
