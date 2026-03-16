import { useState, useRef, useCallback, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../../store/useStore.js'
import { useKeyboardNav } from '../../hooks/useKeyboardNav.js'
import { useNodeVisibility, useDescendantLabelColors } from '../../hooks/useNodeVisibility.js'
import NodeContent from './NodeContent.jsx'
import LabelPill from '../Labels/LabelPill.jsx'
import LabelAssigner from '../Labels/LabelAssigner.jsx'
import DatePickerPopover from './DatePickerPopover.jsx'

function TomorrowBreadcrumb({ node, nodes, tomorrowsTasksRootId }) {
  const updateNode = useStore(s => s.updateNode)

  if (!node.isTomorrowsTask) return null
  if (node.parentId !== tomorrowsTasksRootId) return null
  if (node.uiState?.breadcrumbErased) return null

  const originalId = node.linkedNodeIds[0]
  const original = nodes[originalId]
  if (!original) return null

  const crumbs = []
  let cur = original.parentId ? nodes[original.parentId] : null
  while (cur) {
    crumbs.unshift(cur.content || 'Untitled')
    cur = cur.parentId ? nodes[cur.parentId] : null
  }
  if (crumbs.length === 0) return null

  const hidden = node.uiState?.breadcrumbHidden
  const toggle = () => updateNode(node.id, { uiState: { ...node.uiState, breadcrumbHidden: !hidden } })
  const erase  = () => updateNode(node.id, { uiState: { ...node.uiState, breadcrumbErased: true } })

  if (hidden) {
    return (
      <button
        onClick={toggle}
        title="Show origin"
        className="text-[11px] text-zinc-300 dark:text-zinc-600 hover:text-blue-400 italic mt-0.5"
      >↩ origin hidden</button>
    )
  }

  return (
    <div data-testid={`breadcrumb-tomorrow-${node.id}`} className="flex items-center gap-0.5 mt-0.5 group/crumb">
      <span className="text-[11px] text-blue-400 dark:text-blue-500 italic">
        {crumbs.join(' → ')}
      </span>
      <span className="flex items-center gap-0.5 opacity-0 group-hover/crumb:opacity-100 transition-opacity ml-1">
        <button onClick={toggle} title="Hide breadcrumb" className="text-[10px] text-zinc-300 hover:text-zinc-500 px-0.5">…</button>
        <button onClick={erase}  title="Erase breadcrumb" className="text-[10px] text-zinc-300 hover:text-red-400 px-0.5">×</button>
      </span>
    </div>
  )
}

function TodayBreadcrumb({ node, nodes, todaysTasksRootId }) {
  const updateNode = useStore(s => s.updateNode)

  if (!node.isTodaysTask) return null
  if (node.parentId !== todaysTasksRootId) return null
  if (node.uiState?.breadcrumbErased) return null

  const originalId = node.linkedNodeIds[0]
  const original = nodes[originalId]
  if (!original) return null

  const crumbs = []
  let cur = original.parentId ? nodes[original.parentId] : null
  while (cur) {
    crumbs.unshift(cur.content || 'Untitled')
    cur = cur.parentId ? nodes[cur.parentId] : null
  }
  if (crumbs.length === 0) return null

  const hidden = node.uiState?.breadcrumbHidden
  const toggle = () => updateNode(node.id, { uiState: { ...node.uiState, breadcrumbHidden: !hidden } })
  const erase  = () => updateNode(node.id, { uiState: { ...node.uiState, breadcrumbErased: true } })

  if (hidden) {
    return (
      <button
        onClick={toggle}
        title="Show origin"
        className="text-[11px] text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 italic mt-0.5"
      >↩ origin hidden</button>
    )
  }

  return (
    <div data-testid={`breadcrumb-${node.id}`} className="flex items-center gap-0.5 mt-0.5 group/crumb">
      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">
        {crumbs.join(' → ')}
      </span>
      <span className="flex items-center gap-0.5 opacity-0 group-hover/crumb:opacity-100 transition-opacity ml-1">
        <button onClick={toggle} title="Hide breadcrumb" className="text-[10px] text-zinc-300 hover:text-zinc-500 px-0.5">…</button>
        <button onClick={erase}  title="Erase breadcrumb" className="text-[10px] text-zinc-300 hover:text-red-400 px-0.5">×</button>
      </span>
    </div>
  )
}

export default function NodeItem({ nodeId, parentId, depth = 0, focusNode }) {
  const node = useStore(s => s.nodes[nodeId])
  const labels = useStore(s => s.labels)
  const { updateNodeContent, toggleComplete, toggleExpand, toggleNodeType,
          toggleLabelOnNode, deleteNode, openDetailsModal, addChildNode, dragMode,
          linkToTodaysTasks, unlinkFromTodaysTasks, todaysTasksRootId,
          linkToTomorrowsTasks, unlinkFromTomorrowsTasks, tomorrowsTasksRootId,
          markCompleteInPast, beginContentEdit, commitContentEdit } = useStore()
  const nodes = useStore(s => s.nodes)

  const visibility = useNodeVisibility()
  const vis = visibility[nodeId] ?? { visible: true, dimmed: false, hasHiddenChildren: false }
  const descendantColors = useDescendantLabelColors(nodeId)

  const [showLabelAssigner, setShowLabelAssigner] = useState(false)
  const [showNodeMenu, setShowNodeMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const datePickerRef = useRef(null)
  const menuRef = useRef(null)
  const nodeRef = useRef(null)

  useEffect(() => {
    if (!showDatePicker) return
    const handler = (e) => {
      if (!datePickerRef.current?.contains(e.target)) setShowDatePicker(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [showDatePicker])

  useEffect(() => {
    if (!showNodeMenu) return
    const handler = (e) => {
      if (!menuRef.current?.contains(e.target)) setShowNodeMenu(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [showNodeMenu])

  const nestTargetId = useStore(s => s.nestTargetId)
  const nestZoneActive = useStore(s => s.nestZoneActive)
  const isNestTarget = nestTargetId === nodeId

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: nodeId,
    data: { type: 'node', nodeId, parentId, depth },
  })

  const handleKeyDown = useKeyboardNav(nodeId, parentId, focusNode, () => setShowLabelAssigner(true))

  const focusThis = useCallback(() => {
    const el = nodeRef.current?.querySelector('[contenteditable]')
    if (el) { el.focus(); const range = document.createRange(); range.selectNodeContents(el); range.collapse(false); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range) }
  }, [])

  const CARD_SEL = '[data-testid^="card-"]:not([data-testid^="card-h"]):not([data-testid="card-list"])'

  const handleWrapperKeyDown = useCallback((e) => {
    if (e.target.contentEditable === 'true') return

    // ↑ / ↓ — move within same card
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const cardEl = e.currentTarget.closest(CARD_SEL)
      if (!cardEl) return
      const nodes = [...cardEl.querySelectorAll('[data-testid^="node-"]:not([data-testid^="node-handle-"])')]
      const idx = nodes.indexOf(e.currentTarget)
      if (e.key === 'ArrowDown') {
        nodes[idx + 1]?.focus()
      } else {
        if (idx > 0) nodes[idx - 1].focus()
        else cardEl.querySelector('[data-testid^="card-header-"]')?.focus()
      }
      return
    }

    // → — expand collapsed node, or focus first child if already expanded
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (node.childrenIds.length > 0) {
        if (!node.uiState.isExpanded) {
          toggleExpand(nodeId)
        } else {
          const cardEl = e.currentTarget.closest(CARD_SEL)
          if (!cardEl) return
          const nodes = [...cardEl.querySelectorAll('[data-testid^="node-"]:not([data-testid^="node-handle-"])')]
          const idx = nodes.indexOf(e.currentTarget)
          nodes[idx + 1]?.focus()
        }
      }
      return
    }

    // ← — collapse expanded node, or jump to parent
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (node.uiState.isExpanded && node.childrenIds.length > 0) {
        toggleExpand(nodeId)
      } else if (parentId) {
        document.querySelector(`[data-testid="node-${parentId}"]`)?.focus()
      }
      return
    }

    // Tab / Shift+Tab — jump to next/prev card header
    if (e.key === 'Tab') {
      e.preventDefault()
      const cards = [...document.querySelectorAll(CARD_SEL)]
      const cardEl = e.currentTarget.closest(CARD_SEL)
      if (!cardEl) return
      const cardIdx = cards.indexOf(cardEl)
      const target = e.shiftKey ? cards[cardIdx - 1] : cards[cardIdx + 1]
      target?.querySelector('[data-testid^="card-header-"]')?.focus()
      return
    }

    if (e.key === 'Enter') { e.preventDefault(); focusThis() }
    if (e.key === ' ') { e.preventDefault(); if (node.type === 'CHECKBOX') toggleComplete(nodeId) }
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); openDetailsModal(nodeId) }
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') { e.preventDefault(); setShowLabelAssigner(true) }
  }, [node, nodeId, parentId, focusThis, toggleComplete, openDetailsModal, toggleExpand])

  // All hooks have been called — safe to return early now
  if (!node || !vis.visible) return null

  const isCompleted = node.status === 'COMPLETED'
  const hasChildren = node.childrenIds.length > 0
  const nodeLabels = node.labelIds.map(id => labels[id]).filter(Boolean)

  // Today's Tasks linking
  const hasTodaysCopy = node.linkedNodeIds.some(lid => nodes[lid]?.isTodaysTask)
  const isTodaysCopy = node.isTodaysTask && node.linkedNodeIds.length > 0 && node.id !== todaysTasksRootId
  const canAddToToday = todaysTasksRootId && !node.isTodaysTask && !node.isTomorrowsTask && !hasTodaysCopy

  // Tomorrow's Tasks linking
  const hasTomorrowCopy = node.linkedNodeIds.some(lid => nodes[lid]?.isTomorrowsTask)
  const isTomorrowsCopy = node.isTomorrowsTask && node.linkedNodeIds.length > 0 && node.id !== tomorrowsTasksRootId
  const canAddToTomorrow = tomorrowsTasksRootId && !node.isTodaysTask && !node.isTomorrowsTask && !hasTomorrowCopy && !hasTodaysCopy

  const hasLinkedRelationship = hasTodaysCopy || isTodaysCopy || hasTomorrowCopy || isTomorrowsCopy

  const style = {
    transform: (nestZoneActive && !isDragging) ? undefined : CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : vis.dimmed ? 0.45 : 1,
  }

  return (
    <div
      ref={(el) => { setNodeRef(el); nodeRef.current = el }}
      data-nodeid={nodeId}
      data-testid={`node-${nodeId}`}
      tabIndex={0}
      onKeyDown={handleWrapperKeyDown}
      style={{ ...style, paddingLeft: depth > 0 ? `${Math.min(depth * 16, 64)}px` : undefined }}
      className="group relative outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:rounded-lg"
    >
      <div
        {...attributes}
        tabIndex={-1}
        className={`flex items-start gap-1.5 py-0.5 rounded-lg px-1 -mx-1 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors ${dragMode ? 'cursor-grab select-none' : ''} ${vis.dimmed ? 'opacity-40' : ''} ${isNestTarget ? 'ring-2 ring-indigo-400' : ''}`}
      >
        {/* Drag handle — listeners scoped here so touch-none doesn't block pinch zoom on the rest of the row */}
        <span
          {...listeners}
          data-testid={`node-handle-${nodeId}`}
          className={`flex-shrink-0 mt-1 text-zinc-400 touch-none ${dragMode ? 'opacity-40' : 'opacity-20 group-hover:opacity-60'}`}
          aria-hidden="true"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
          </svg>
        </span>

        {/* Interactive content — disabled in drag mode */}
        <div className={`flex items-start gap-1.5 flex-1 min-w-0 ${dragMode ? 'pointer-events-none' : ''}`}>

        {/* Expand toggle */}
        <button
          onClick={() => hasChildren && toggleExpand(nodeId)}
          className={`flex-shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center text-zinc-400 transition-transform ${
            hasChildren ? 'hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer' : 'opacity-0 cursor-default'
          } ${node.uiState.isExpanded ? '' : '-rotate-90'}`}
          tabIndex={-1}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Checkbox or bullet */}
        {node.type === 'CHECKBOX' ? (
          <button
            data-testid={`checkbox-${nodeId}`}
            tabIndex={-1}
            onClick={() => toggleComplete(nodeId)}
            title={isCompleted && node.completedAt
              ? `Completed ${new Date(node.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
              : undefined}
            className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              isCompleted
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-500 dark:hover:border-zinc-400'
            }`}
          >
            {isCompleted && (
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ) : (
          <span className="flex-shrink-0 mt-2 w-4 flex justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
          </span>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <NodeContent
            content={node.content}
            onChange={(val) => updateNodeContent(nodeId, val)}
            onKeyDown={handleKeyDown}
            onFocus={() => beginContentEdit(nodeId)}
            onBlur={() => commitContentEdit(nodeId)}
            placeholder={depth === 0 ? 'Task…' : 'Sub-task…'}
            className={`text-sm text-zinc-800 dark:text-zinc-100 leading-relaxed ${
              isCompleted ? 'line-through text-zinc-400 dark:text-zinc-600' : ''
            }`}
          />

          {/* Labels row */}
          {nodeLabels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {nodeLabels.map(label => (
                <LabelPill
                  key={label.id}
                  label={label}
                  small
                  onRemove={() => toggleLabelOnNode(nodeId, label.id)}
                />
              ))}
            </div>
          )}

          {/* Collapsed summary dots */}
          {!node.uiState.isExpanded && hasChildren && descendantColors.length > 0 && (
            <div className="flex gap-1 mt-1">
              {descendantColors.map((color, i) => (
                <span key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              ))}
            </div>
          )}

          {/* Hidden children indicator */}
          {vis.hasHiddenChildren && node.uiState.isExpanded && (
            <p className="text-[10px] text-zinc-400 italic mt-0.5">Some items hidden by filter</p>
          )}

          {/* Breadcrumb — shows origin context for today-copy nodes */}
          <TodayBreadcrumb node={node} nodes={nodes} todaysTasksRootId={todaysTasksRootId} />
          <TomorrowBreadcrumb node={node} nodes={nodes} tomorrowsTasksRootId={tomorrowsTasksRootId} />
        </div>

        {/* Node actions — single ... button on hover, opens overflow menu */}
        <div ref={menuRef} className={`relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${showNodeMenu || showLabelAssigner || showDatePicker ? '!opacity-100' : ''}`}>
          <button
            tabIndex={-1}
            onClick={() => setShowNodeMenu(v => !v)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            title="Actions"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
            </svg>
          </button>

          {showNodeMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg shadow-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 py-1">
              <button
                tabIndex={-1}
                onClick={() => { addChildNode(nodeId); useStore.getState().updateNode(nodeId, { uiState: { ...node.uiState, isExpanded: true } }); setShowNodeMenu(false) }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
                </svg>
                Add sub-item
              </button>

              <button
                tabIndex={-1}
                onClick={() => { toggleNodeType(nodeId); setShowNodeMenu(false) }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left"
              >
                {node.type === 'CHECKBOX' ? (
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="4" strokeWidth={2} />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="3" strokeWidth={2} />
                  </svg>
                )}
                {node.type === 'CHECKBOX' ? 'Switch to bullet' : 'Switch to checkbox'}
              </button>

              <button
                tabIndex={-1}
                onClick={() => { setShowNodeMenu(false); setShowLabelAssigner(true) }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Label
              </button>

              <button
                tabIndex={-1}
                onClick={() => { openDetailsModal(nodeId); setShowNodeMenu(false) }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
                Details
              </button>

              {canAddToToday && (
                <button
                  tabIndex={-1}
                  onClick={() => { linkToTodaysTasks(nodeId); setShowNodeMenu(false) }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="4" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                  Add to Today
                </button>
              )}

              {canAddToTomorrow && (
                <button
                  tabIndex={-1}
                  data-testid={`tomorrow-btn-${nodeId}`}
                  onClick={() => { linkToTomorrowsTasks(nodeId); setShowNodeMenu(false) }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                  Add to Tomorrow
                </button>
              )}

              <button
                tabIndex={-1}
                onClick={() => { setShowNodeMenu(false); setShowDatePicker(true) }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                Mark complete in past
              </button>

              <div className="my-1 border-t border-zinc-100 dark:border-zinc-700" />

              <button
                tabIndex={-1}
                onClick={() => {
                  setShowNodeMenu(false)
                  if (hasLinkedRelationship) {
                    setShowDeleteConfirm(true)
                  } else {
                    deleteNode(nodeId)
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 w-full text-left"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          )}

          {showLabelAssigner && (
            <LabelAssigner nodeId={nodeId} onClose={() => setShowLabelAssigner(false)} />
          )}

          <div ref={datePickerRef}>
            {showDatePicker && (
              <DatePickerPopover
                onSelectDate={(date) => markCompleteInPast(nodeId, date)}
                onClose={() => setShowDatePicker(false)}
              />
            )}
          </div>
        </div>
        </div>{/* end interactive content wrapper */}

      </div>

      {/* Delete confirmation for linked nodes */}
      {showDeleteConfirm && (
        <div className="mt-1 ml-6 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs">
          {isTodaysCopy ? (
            <>
              <p className="text-red-700 dark:text-red-300 mb-1.5 font-medium">Remove from Today&apos;s Tasks?</p>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => { unlinkFromTodaysTasks(nodeId); setShowDeleteConfirm(false) }}
                  className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                >Remove only</button>
                <button
                  onClick={() => {
                    const originalId = node.linkedNodeIds[0]
                    if (originalId) deleteNode(originalId, { deleteLinked: true })
                    else unlinkFromTodaysTasks(nodeId)
                    setShowDeleteConfirm(false)
                  }}
                  className="px-2 py-1 rounded bg-red-700 text-white hover:bg-red-800"
                >Remove &amp; delete original</button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                >Cancel</button>
              </div>
            </>
          ) : isTomorrowsCopy ? (
            <>
              <p className="text-red-700 dark:text-red-300 mb-1.5 font-medium">Remove from Tomorrow&apos;s Tasks?</p>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => { unlinkFromTomorrowsTasks(nodeId); setShowDeleteConfirm(false) }}
                  className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                >Remove only</button>
                <button
                  onClick={() => {
                    const originalId = node.linkedNodeIds[0]
                    if (originalId) deleteNode(originalId, { deleteLinked: true })
                    else unlinkFromTomorrowsTasks(nodeId)
                    setShowDeleteConfirm(false)
                  }}
                  className="px-2 py-1 rounded bg-red-700 text-white hover:bg-red-800"
                >Remove &amp; delete original</button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                >Cancel</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-red-700 dark:text-red-300 mb-1.5 font-medium">This task is linked in Today&apos;s or Tomorrow&apos;s Tasks.</p>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => { deleteNode(nodeId, { deleteLinked: true }); setShowDeleteConfirm(false) }}
                  className="px-2 py-1 rounded bg-red-700 text-white hover:bg-red-800"
                >Delete both</button>
                <button
                  onClick={() => { deleteNode(nodeId); setShowDeleteConfirm(false) }}
                  className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                >Just this task</button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                >Cancel</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Children */}
      {node.uiState.isExpanded && hasChildren && (
        <div className="ml-6">
          {node.childrenIds.map(childId => (
            <NodeItem
              key={childId}
              nodeId={childId}
              parentId={nodeId}
              depth={depth + 1}
              focusNode={focusNode}
            />
          ))}
        </div>
      )}
    </div>
  )
}
