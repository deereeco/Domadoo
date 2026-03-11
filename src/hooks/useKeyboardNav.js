import { useCallback } from 'react'
import { useStore } from '../store/useStore.js'

export function useKeyboardNav(nodeId, parentId, focusNode) {
  const store = useStore()

  const handleKeyDown = useCallback((e) => {
    const { nodes } = store

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // Create sibling after this node
      let newId
      if (parentId) {
        newId = store.addChildNode(parentId, nodeId)
      } else {
        // Root card — add at end
        newId = store.addRootNode()
      }
      setTimeout(() => focusNode && focusNode(newId), 0)
    }

    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      // Indent: make this a child of the previous sibling
      const parent = parentId ? nodes[parentId] : null
      const siblings = parent ? parent.childrenIds : store.rootOrder
      const myIndex = siblings.indexOf(nodeId)
      if (myIndex > 0) {
        const prevSiblingId = siblings[myIndex - 1]
        const prevSibling = nodes[prevSiblingId]
        if (prevSibling) {
          store.moveNode({
            nodeId,
            newParentId: prevSiblingId,
            newIndex: prevSibling.childrenIds.length,
          })
          // Expand the new parent
          store.updateNode(prevSiblingId, {
            uiState: { ...prevSibling.uiState, isExpanded: true },
          })
          setTimeout(() => focusNode && focusNode(nodeId), 0)
        }
      }
    }

    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      // Outdent: move to be sibling after parent
      if (!parentId) return
      const grandParent = nodes[parentId]?.parentId ?? null
      const parentNode = nodes[parentId]
      if (!parentNode) return

      const parentSiblings = grandParent
        ? nodes[grandParent]?.childrenIds ?? []
        : store.rootOrder
      const parentIndex = parentSiblings.indexOf(parentId)

      store.moveNode({
        nodeId,
        newParentId: grandParent,
        newIndex: parentIndex + 1,
      })
      setTimeout(() => focusNode && focusNode(nodeId), 0)
    }

    if (e.key === 'Backspace' && e.currentTarget.textContent === '') {
      e.preventDefault()
      // Delete empty node and focus previous
      const parent = parentId ? nodes[parentId] : null
      const siblings = parent ? parent.childrenIds : store.rootOrder
      const myIndex = siblings.indexOf(nodeId)
      const prevId = myIndex > 0 ? siblings[myIndex - 1] : parentId

      store.deleteNode(nodeId)
      setTimeout(() => focusNode && focusNode(prevId), 0)
    }
  }, [nodeId, parentId, store, focusNode])

  return handleKeyDown
}
