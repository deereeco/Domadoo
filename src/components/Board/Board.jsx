import { useCallback, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import { DoubleTapSensor } from '../../sensors/DoubleTapSensor.js'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { useStore } from '../../store/useStore.js'
import RootCard from '../Card/RootCard.jsx'

export default function Board() {
  const { rootOrder, nodes, addRootNode, moveNode, reorderRootCards, reorderChildren, dragMode } = useStore()

  const [activeDragType, setActiveDragType] = useState(null)
  const { setNodeRef: setBoardRef, isOver: isBoardOver } = useDroppable({
    id: 'board-background',
    data: { type: 'board' },
  })

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  const doubleTapSensor = useSensor(DoubleTapSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  const sensors = useSensors(dragMode ? pointerSensor : doubleTapSensor)

  const handleDragStart = useCallback(({ active }) => {
    setActiveDragType(active.data.current?.type ?? null)
  }, [])

  const handleDragEnd = useCallback(({ active, over }) => {
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

      // Drop onto a card body → reparent into that card
      if (overData?.type === 'card-body') {
        const targetParent = overData.cardId
        const targetNode = nodes[targetParent]
        if (targetNode) {
          moveNode({ nodeId, newParentId: targetParent, newIndex: targetNode.childrenIds.length })
        }
        return
      }

      // Drop onto another node → reparent or reorder
      if (overData?.type === 'node') {
        const overNode = nodes[overData.nodeId]
        if (!overNode) return

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
  }, [rootOrder, nodes, moveNode, reorderRootCards, reorderChildren])

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <SortableContext items={rootOrder} strategy={rectSortingStrategy}>
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
            {rootOrder.map(id => (
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
            <p className="text-sm text-zinc-400 dark:text-zinc-600 mb-6">Create a card to get started</p>
            <button
              onClick={addRootNode}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              + New Card
            </button>
          </div>
        )}

        {rootOrder.length > 0 && !activeDragType && (
          <div className="mt-4">
            <button
              onClick={addRootNode}
              className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors w-full justify-center"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
              </svg>
              New Card
            </button>
          </div>
        )}

        {activeDragType === 'node' && (
          <div
            ref={setBoardRef}
            className={`mt-4 flex items-center justify-center h-16 rounded-2xl border-2 border-dashed transition-colors ${
              isBoardOver
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500'
                : 'border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-600'
            }`}
          >
            <span className="text-sm">Drop here to create a new card</span>
          </div>
        )}
      </div>
    </DndContext>
  )
}
