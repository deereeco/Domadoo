import { useCallback, useState, useRef, useEffect } from 'react'
import {
  DndContext,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import { DoubleTapSensor } from '../../sensors/DoubleTapSensor.js'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { useStore } from '../../store/useStore.js'
import { useBoardKeyNav } from '../../hooks/useBoardKeyNav.js'
import RootCard from '../Card/RootCard.jsx'
import HistoryBoard from '../History/HistoryBoard.jsx'

// Must be a separate component so useDroppable runs inside DndContext's tree
function BoardDropZone({ activeDragType }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'board-background', data: { type: 'board' } })
  return (
    <div
      ref={setNodeRef}
      data-testid="board-drop-zone"
      className={`mt-4 rounded-2xl border-2 border-dashed transition-colors ${
        activeDragType === 'node'
          ? `flex items-center justify-center h-16 ${isOver ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500' : 'border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-600'}`
          : 'h-px border-transparent'
      }`}
    >
      {activeDragType === 'node' && <span className="text-sm">Drop here to create a new card</span>}
    </div>
  )
}

export default function Board() {
  const { rootOrder, nodes, addRootNode, moveNode, reorderRootCards, reorderChildren, dragMode, linkToTodaysTasks, todaysTasksRootId, setNestTarget, clearNestTarget, setNestZoneActive, historyViewDate, pinnedCards } = useStore()
  useBoardKeyNav()

  const [activeDragType, setActiveDragType] = useState(null)
  const nestTimerRef = useRef(null)
  const currentNestOverRef = useRef(null)
  const nestZoneActiveRef = useRef(false)

  // Split rootOrder into pinned and unpinned
  const pinnedIds = rootOrder.filter(id => pinnedCards[id])
  const unpinnedIds = rootOrder.filter(id => !pinnedCards[id])

  // Collision detection runs on every pointermove — ideal place to track zone changes.
  // onDragOver only fires when `over` changes, which misses zone transitions within the same target.
  const collisionDetection = useCallback((args) => {
    const collisions = pointerWithin(args)
    const mapped = collisions.map(collision => {
      const droppable = args.droppableContainers.find(d => d.id === collision.id)
      if (droppable?.data?.current?.type !== 'node') return collision
      const rect = args.droppableRects.get(collision.id)
      if (!rect || !args.pointerCoordinates) return collision
      const rel = args.pointerCoordinates.y - rect.top
      const zone = rel < rect.height / 3 ? 'top' : rel > (rect.height * 2) / 3 ? 'bottom' : 'middle'
      return { ...collision, data: { ...collision.data, zone } }
    })

    // Find the primary node collision, excluding the dragged item itself
    const primaryNode = mapped.find(c => {
      if (c.id === args.active?.id) return false
      return args.droppableContainers.find(d => d.id === c.id)?.data?.current?.type === 'node'
    })

    const zone = primaryNode?.data?.zone
    const overId = primaryNode?.id ?? null

    if (zone === 'middle' && overId !== null) {
      if (!nestZoneActiveRef.current) { nestZoneActiveRef.current = true; setNestZoneActive(true) }
      if (overId !== currentNestOverRef.current) {
        if (nestTimerRef.current) { clearTimeout(nestTimerRef.current); nestTimerRef.current = null }
        clearNestTarget()
        currentNestOverRef.current = overId
        nestTimerRef.current = setTimeout(() => setNestTarget(overId), 400)
      }
    } else {
      if (nestZoneActiveRef.current) { nestZoneActiveRef.current = false; setNestZoneActive(false) }
      if (currentNestOverRef.current !== null) {
        currentNestOverRef.current = null
        if (nestTimerRef.current) { clearTimeout(nestTimerRef.current); nestTimerRef.current = null }
        clearNestTarget()
      }
    }

    return mapped
  }, [clearNestTarget, setNestTarget, setNestZoneActive])

  // Zoom reset
  const [isZoomed, setIsZoomed] = useState(false)
  const bgTapRef = useRef(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const check = () => setIsZoomed(vv.scale > 1.05)
    check()
    vv.addEventListener('resize', check)
    vv.addEventListener('scroll', check)
    return () => {
      vv.removeEventListener('resize', check)
      vv.removeEventListener('scroll', check)
    }
  }, [])

  const resetZoom = useCallback(() => {
    const meta = document.querySelector('meta[name="viewport"]')
    if (!meta) return
    const orig = meta.content
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { meta.content = orig })
    })
  }, [])

  const handleBgTap = useCallback((e) => {
    // Only trigger on the board background, not on card/task elements
    if (e.target.closest('[data-nodeid]')) return
    const now = Date.now()
    if (bgTapRef.current && now - bgTapRef.current < 350 && window.visualViewport?.scale > 1.05) {
      resetZoom()
      bgTapRef.current = null
    } else {
      bgTapRef.current = now
      setTimeout(() => { bgTapRef.current = null }, 350)
    }
  }, [resetZoom])

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  const doubleTapSensor = useSensor(DoubleTapSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  const sensors = useSensors(dragMode ? pointerSensor : doubleTapSensor)

  const handleDragStart = useCallback(({ active }) => {
    setActiveDragType(active.data.current?.type ?? null)
  }, [])

  const handleDragEnd = useCallback(({ active, over }) => {
    if (nestTimerRef.current) { clearTimeout(nestTimerRef.current); nestTimerRef.current = null }
    const nestTargetId = useStore.getState().nestTargetId
    clearNestTarget()
    nestZoneActiveRef.current = false
    setNestZoneActive(false)
    currentNestOverRef.current = null
    setActiveDragType(null)
    if (!over || active.id === over.id) return

    const activeData = active.data.current
    const overData = over.data.current

    if (!activeData) return

    // Card reordering (root to root)
    if (activeData.type === 'card') {
      const oldIdx = rootOrder.indexOf(active.id)
      const newIdx = rootOrder.indexOf(over.id)
      if (oldIdx !== -1 && newIdx !== -1) {
        reorderRootCards(oldIdx, newIdx)
      }
      // Merge: drag root card into another card's body
      if (overData?.type === 'card-body' && overData.cardId !== active.id) {
        const cardId = active.id
        const targetParent = overData.cardId
        const targetNode = nodes[targetParent]
        if (targetNode) {
          moveNode({ nodeId: cardId, newParentId: targetParent, newIndex: targetNode.childrenIds.length })
        }
      }
      return
    }

    // Node reordering / reparenting
    if (activeData.type === 'node') {
      const nodeId = activeData.nodeId
      const currentNode = nodes[nodeId]
      if (!currentNode) return

      // Drop onto board background → extract to root
      if (overData?.type === 'board') {
        moveNode({ nodeId, newParentId: null, newIndex: rootOrder.length })
        return
      }

      // Drop onto a card body → reparent into that card (or link to today's tasks)
      if (overData?.type === 'card-body') {
        const targetParent = overData.cardId
        const targetNode = nodes[targetParent]
        if (targetNode) {
          const isDropOnTodaysCard = targetParent === todaysTasksRootId
          const sourceIsLinkedCopy = nodes[nodeId]?.isTodaysTask
          if (isDropOnTodaysCard && !sourceIsLinkedCopy) {
            linkToTodaysTasks(nodeId)
          } else {
            moveNode({ nodeId, newParentId: targetParent, newIndex: targetNode.childrenIds.length })
          }
        }
        return
      }

      // Drop onto another node → reparent or reorder
      if (overData?.type === 'node') {
        const overNode = nodes[overData.nodeId]
        if (!overNode) return

        // Hover-to-nest: drop as last child of target node
        if (nestTargetId === over.id && overData.nodeId !== nodeId) {
          moveNode({ nodeId, newParentId: overData.nodeId, newIndex: overNode.childrenIds.length })
          return
        }

        // Same parent: reorder
        if (currentNode.parentId === overNode.parentId) {
          const parent = currentNode.parentId ? nodes[currentNode.parentId] : null
          const siblings = parent ? parent.childrenIds : rootOrder
          const oldIdx = siblings.indexOf(nodeId)
          const newIdx = siblings.indexOf(overData.nodeId)
          if (oldIdx !== -1 && newIdx !== -1) {
            if (currentNode.parentId) {
              reorderChildren(currentNode.parentId, oldIdx, newIdx)
            } else {
              reorderRootCards(oldIdx, newIdx)
            }
          }
        } else {
          // Different parent: reparent as sibling of overNode
          const newParent = overNode.parentId
          const newParentNode = newParent ? nodes[newParent] : null
          const siblings = newParentNode ? newParentNode.childrenIds : rootOrder
          const newIdx = siblings.indexOf(overData.nodeId)
          moveNode({ nodeId, newParentId: newParent, newIndex: Math.max(0, newIdx) })
        }
        return
      }
    }
  }, [rootOrder, nodes, moveNode, reorderRootCards, reorderChildren, linkToTodaysTasks, todaysTasksRootId, clearNestTarget, setNestZoneActive])

  // Render history board when a past date is selected
  if (historyViewDate) return <HistoryBoard />

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEnd} measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}>
      {isZoomed && (
        <button
          onClick={resetZoom}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-zinc-800/90 dark:bg-zinc-700/90 text-white text-sm shadow-lg backdrop-blur-sm"
        >
          Reset zoom
        </button>
      )}
      <div data-testid="board" onClick={handleBgTap} className="touch-manipulation max-w-screen-xl mx-auto px-4 py-6">

        {/* Pinned section */}
        {pinnedIds.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
              </svg>
              <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Pinned</span>
            </div>
            <SortableContext items={pinnedIds} strategy={rectSortingStrategy}>
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
                {pinnedIds.map(id => (
                  <RootCard key={id} nodeId={id} />
                ))}
              </div>
            </SortableContext>
            <div className="mt-6 border-b border-zinc-200 dark:border-zinc-800" />
          </div>
        )}

        {/* Main board */}
        <SortableContext items={unpinnedIds} strategy={rectSortingStrategy}>
          <div data-testid="card-list" className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
            {unpinnedIds.map(id => (
              <RootCard key={id} nodeId={id} />
            ))}
          </div>
        </SortableContext>

        {rootOrder.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-zinc-300 dark:text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-zinc-500 dark:text-zinc-400 mb-1">Your board is empty</h2>
            <p className="text-sm text-zinc-400 dark:text-zinc-600 mb-6">Use the New Card button above to get started</p>
          </div>
        )}

        <BoardDropZone activeDragType={activeDragType} />
      </div>
    </DndContext>
  )
}
