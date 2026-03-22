import { create } from 'zustand'
import { createNode, createLabel, createHistorySnapshot } from '../types/index.js'
import { saveToCache, loadFromCache, saveUser, loadUser, clearUser } from '../services/localCache.js'

const SYSTEM_TODAY_LABEL_ID = 'system-today-label-0000-000000000000'
const SYSTEM_TODAY_LABEL = { id: SYSTEM_TODAY_LABEL_ID, name: 'Today', color: '#FCD34D', isSystem: true }

const SYSTEM_TOMORROW_LABEL_ID = 'system-tomorrow-label-0000-000000000000'
const SYSTEM_TOMORROW_LABEL = { id: SYSTEM_TOMORROW_LABEL_ID, name: 'Tomorrow', color: '#93C5FD', isSystem: true }

const DEFAULT_STATE = {
  nodes: {},
  labels: { [SYSTEM_TODAY_LABEL_ID]: SYSTEM_TODAY_LABEL, [SYSTEM_TOMORROW_LABEL_ID]: SYSTEM_TOMORROW_LABEL },
  rootOrder: [],
  activeFilters: {},
  todaysTasksRootId: null,
  todaysTasksLabelId: SYSTEM_TODAY_LABEL_ID,
  tomorrowsTasksRootId: null,
  tomorrowsTasksLabelId: SYSTEM_TOMORROW_LABEL_ID,
  theme: 'dark',
  user: null,
  detailsModalNodeId: null,
  showDoneToday: false,
  showLabelManager: false,
  syncStatus: 'idle', // 'idle' | 'saving' | 'error'
  dragMode: false,
  nestTargetId: null,
  nestZoneActive: false,
  // Daily cleanup & history
  history: [],           // DaySnapshot[]  (persisted)
  lastCleanupDate: null, // 'YYYY-MM-DD'   (persisted)
  pendingCleanupTasks: null, // [{id, content, originalId, resolved}] | null (ephemeral)
  isPeeking: false,      // bool (ephemeral) — board peek mode during cleanup
  peekCardIds: null,     // Set<string> | null — card IDs locked during peek
  showHistory: false,    // bool (ephemeral)
  historyViewDate: null, // 'YYYY-MM-DD' | null (ephemeral)
  showDemoModal: false,  // bool (ephemeral)
  // Demo mode
  isDemoMode: false,
  savedRealData: null,   // { nodes, rootOrder, history, lastCleanupDate, todaysTasksRootId, tomorrowsTasksRootId } | null
  // Card UI state (ephemeral)
  collapsedCards: {},    // { [nodeId]: true }
  pinnedCards: {},       // { [nodeId]: true }
  // Multi-device merge
  deletedNodes: {},      // { [nodeId]: { deletedAt: number } }  (persisted)
  rootOrderUpdatedAt: 0, // number (persisted) — when rootOrder was last changed by a drag/move
  lastDriveSyncAt: 0,    // number (ephemeral) — savedAt of last Drive state we know about
  // Undo / redo (ephemeral, session only)
  _undoStack: [],        // [{nodes, rootOrder}] — max 50
  _redoStack: [],        // [{nodes, rootOrder}]
  _pendingSnapshot: null, // {nodes, rootOrder, nodeId} captured on content focus
}

export const useStore = create((set, get) => ({
  ...DEFAULT_STATE,

  // ── Hydration ──────────────────────────────────────────────────────────────
  hydrate(data) {
    // Ensure system labels always exist (backward compat with old saves)
    const labels = { ...data.labels, [SYSTEM_TODAY_LABEL_ID]: SYSTEM_TODAY_LABEL, [SYSTEM_TOMORROW_LABEL_ID]: SYSTEM_TOMORROW_LABEL }
    set({ ...DEFAULT_STATE, ...data, labels, todaysTasksLabelId: SYSTEM_TODAY_LABEL_ID, tomorrowsTasksLabelId: SYSTEM_TOMORROW_LABEL_ID, lastDriveSyncAt: data.savedAt || 0 })
  },

  setLastDriveSyncAt(ts) { set({ lastDriveSyncAt: ts }) },

  // ── Undo / Redo ────────────────────────────────────────────────────────────
  _pushSnapshot() {
    const { nodes, rootOrder } = get()
    set(s => ({
      _undoStack: [...s._undoStack, { nodes, rootOrder }].slice(-50),
      _redoStack: [],
    }))
  },

  beginContentEdit(nodeId) {
    const { nodes, rootOrder } = get()
    set({ _pendingSnapshot: { nodes, rootOrder, nodeId } })
  },

  commitContentEdit(nodeId) {
    const { _pendingSnapshot, nodes } = get()
    if (!_pendingSnapshot || _pendingSnapshot.nodeId !== nodeId) return
    const before = _pendingSnapshot.nodes[nodeId]?.content
    const after = nodes[nodeId]?.content
    if (before !== after) {
      const snap = _pendingSnapshot
      set(s => ({
        _undoStack: [...s._undoStack, { nodes: snap.nodes, rootOrder: snap.rootOrder }].slice(-50),
        _redoStack: [],
      }))
    }
    set({ _pendingSnapshot: null })
  },

  undo() {
    set(s => {
      if (s._undoStack.length === 0) return {}
      const snapshot = s._undoStack[s._undoStack.length - 1]
      return {
        nodes: snapshot.nodes,
        rootOrder: snapshot.rootOrder,
        _undoStack: s._undoStack.slice(0, -1),
        _redoStack: [...s._redoStack, { nodes: s.nodes, rootOrder: s.rootOrder }],
      }
    })
  },

  redo() {
    set(s => {
      if (s._redoStack.length === 0) return {}
      const snapshot = s._redoStack[s._redoStack.length - 1]
      return {
        nodes: snapshot.nodes,
        rootOrder: snapshot.rootOrder,
        _redoStack: s._redoStack.slice(0, -1),
        _undoStack: [...s._undoStack, { nodes: s.nodes, rootOrder: s.rootOrder }],
      }
    })
  },

  // ── Drag Mode ──────────────────────────────────────────────────────────────
  toggleDragMode() {
    set(s => ({ dragMode: !s.dragMode }))
  },

  // ── Nest Target ────────────────────────────────────────────────────────────
  setNestTarget(id) { set({ nestTargetId: id }) },
  clearNestTarget() { set({ nestTargetId: null }) },
  setNestZoneActive(val) { set({ nestZoneActive: val }) },

  // ── Theme ──────────────────────────────────────────────────────────────────
  toggleTheme() {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    set({ theme: next })
    document.documentElement.classList.toggle('dark', next === 'dark')
  },

  // ── Auth ───────────────────────────────────────────────────────────────────
  setUser(user) {
    saveUser(user)
    set({ user })
  },

  signOut() {
    clearUser()
    set({ user: null })
  },

  // ── Node CRUD ──────────────────────────────────────────────────────────────
  addRootNode() {
    get()._pushSnapshot()
    const node = createNode({ parentId: null })
    set(state => ({
      nodes: { ...state.nodes, [node.id]: node },
      rootOrder: [...state.rootOrder, node.id],
    }))
    return node.id
  },

  addTodaysTasksCard() {
    const node = createNode({ parentId: null, content: "Today's Tasks" })
    node.isTodaysTask = true
    set(state => ({
      nodes: { ...state.nodes, [node.id]: node },
      rootOrder: [node.id, ...state.rootOrder],
      todaysTasksRootId: node.id,
      // todaysTasksLabelId already set (SYSTEM_TODAY_LABEL_ID) — don't overwrite
    }))
    return node.id
  },

  addTomorrowsTasksCard() {
    const node = createNode({ parentId: null, content: "Tomorrow's Tasks" })
    node.isTomorrowsTask = true
    set(state => {
      // Insert after Today's Tasks card (index 1) if it exists, else prepend
      const rootOrder = [...state.rootOrder]
      const todayIdx = state.todaysTasksRootId ? rootOrder.indexOf(state.todaysTasksRootId) : -1
      if (todayIdx >= 0) {
        rootOrder.splice(todayIdx + 1, 0, node.id)
      } else {
        rootOrder.unshift(node.id)
      }
      return {
        nodes: { ...state.nodes, [node.id]: node },
        rootOrder,
        tomorrowsTasksRootId: node.id,
      }
    })
    return node.id
  },

  addChildNode(parentId, afterId = null) {
    get()._pushSnapshot()
    const node = createNode({ parentId })
    set(state => {
      const parent = state.nodes[parentId]
      if (!parent) return {}
      let childrenIds = [...parent.childrenIds]
      if (afterId) {
        const idx = childrenIds.indexOf(afterId)
        childrenIds.splice(idx + 1, 0, node.id)
      } else {
        childrenIds.push(node.id)
      }

      const updates = {
        [node.id]: node,
        [parentId]: { ...parent, childrenIds },
      }

      // Sync new child to linked today copies
      let todayParentId = null
      if (parent.isTodaysTask) {
        // Adding directly into a today copy — sync back to original parent too
        todayParentId = parentId
        const originalParentId = parent.linkedNodeIds[0]
        if (originalParentId) {
          const origParent = state.nodes[originalParentId]
          if (origParent) {
            const origChildrenIds = [...origParent.childrenIds]
            origChildrenIds.push(node.id)
            updates[originalParentId] = { ...origParent, childrenIds: origChildrenIds }
            updates[node.id] = { ...node, parentId: originalParentId }
          }
        }
      } else {
        // Adding to an original — find its today-copy parent
        const linkedTodayParent = parent.linkedNodeIds.find(lid => state.nodes[lid]?.isTodaysTask)
        if (linkedTodayParent) todayParentId = linkedTodayParent
      }

      if (todayParentId) {
        const todayChildId = node.id + '_today'
        const todayChild = {
          ...node,
          id: todayChildId,
          parentId: todayParentId,
          childrenIds: [],
          isTodaysTask: true,
          linkedNodeIds: [node.id],
        }
        // Wire original back to today copy
        updates[node.id] = { ...updates[node.id], linkedNodeIds: [todayChildId] }

        // Insert today child into today parent's childrenIds at matching position
        const todayParent = state.nodes[todayParentId]
        const todayChildrenIds = [...(todayParent?.childrenIds ?? [])]
        if (afterId && !parent.isTodaysTask) {
          const afterTodayId = afterId + '_today'
          const idx = todayChildrenIds.indexOf(afterTodayId)
          idx !== -1
            ? todayChildrenIds.splice(idx + 1, 0, todayChildId)
            : todayChildrenIds.push(todayChildId)
        } else {
          todayChildrenIds.push(todayChildId)
        }
        updates[todayChildId] = todayChild
        updates[todayParentId] = { ...todayParent, childrenIds: todayChildrenIds }
      }

      return { nodes: { ...state.nodes, ...updates } }
    })
    return node.id
  },

  updateNode(id, patch) {
    set(state => {
      const node = state.nodes[id]
      if (!node) return {}
      return { nodes: { ...state.nodes, [id]: { ...node, ...patch } } }
    })
  },

  updateNodeContent(id, content) {
    const ts = Date.now()
    set(state => {
      const node = state.nodes[id]
      if (!node) return {}
      const updates = { [id]: { ...node, content, updatedAt: ts } }
      node.linkedNodeIds.forEach(lid => {
        const linked = state.nodes[lid]
        if (linked) updates[lid] = { ...linked, content, updatedAt: ts }
      })
      return { nodes: { ...state.nodes, ...updates } }
    })
  },

  toggleNodeType(id) {
    const ts = Date.now()
    set(state => {
      const node = state.nodes[id]
      if (!node) return {}
      const type = node.type === 'CHECKBOX' ? 'BULLET' : 'CHECKBOX'
      const updates = { [id]: { ...node, type, updatedAt: ts } }
      node.linkedNodeIds.forEach(lid => {
        const linked = state.nodes[lid]
        if (linked) updates[lid] = { ...linked, type, updatedAt: ts }
      })
      return { nodes: { ...state.nodes, ...updates } }
    })
  },

  toggleComplete(id) {
    get()._pushSnapshot()
    const ts = Date.now()
    set(state => {
      const node = state.nodes[id]
      if (!node) return {}
      const isCompleting = node.status !== 'COMPLETED'
      const updates = {}

      const applyComplete = (nodeId) => {
        const n = state.nodes[nodeId]
        if (!n) return
        updates[nodeId] = {
          ...n,
          status: isCompleting ? 'COMPLETED' : 'OPEN',
          completedAt: isCompleting ? new Date().toISOString() : null,
          updatedAt: ts,
        }
        // propagate to linked nodes
        n.linkedNodeIds.forEach(linkedId => {
          const linked = state.nodes[linkedId]
          if (linked) {
            updates[linkedId] = {
              ...linked,
              status: isCompleting ? 'COMPLETED' : 'OPEN',
              completedAt: isCompleting ? new Date().toISOString() : null,
              updatedAt: ts,
            }
          }
        })
      }

      applyComplete(id)
      return { nodes: { ...state.nodes, ...updates } }
    })
  },

  toggleExpand(id) {
    set(state => {
      const node = state.nodes[id]
      if (!node) return {}
      return {
        nodes: {
          ...state.nodes,
          [id]: { ...node, uiState: { ...node.uiState, isExpanded: !node.uiState.isExpanded } },
        },
      }
    })
  },

  deleteNode(id, { deleteLinked = false } = {}) {
    get()._pushSnapshot()
    set(state => {
      const node = state.nodes[id]
      if (!node) return {}

      const toDelete = new Set()
      const collectDescendants = (nid) => {
        toDelete.add(nid)
        const n = state.nodes[nid]
        if (!n) return
        n.childrenIds.forEach(collectDescendants)
        // Always collect any _today linked copies
        n.linkedNodeIds.forEach(lid => {
          const linked = state.nodes[lid]
          if (linked?.isTodaysTask && !toDelete.has(lid)) collectDescendants(lid)
        })
      }
      collectDescendants(id)

      const newNodes = { ...state.nodes }
      const deletedAt = Date.now()
      const newDeletedNodes = { ...state.deletedNodes }
      toDelete.forEach(nid => {
        delete newNodes[nid]
        newDeletedNodes[nid] = { deletedAt }
      })

      // Clean up linkedNodeIds and today label on surviving nodes that referenced deleted nodes
      Object.keys(newNodes).forEach(nid => {
        const n = newNodes[nid]
        if (!n.linkedNodeIds || n.linkedNodeIds.length === 0) return
        const filtered = n.linkedNodeIds.filter(lid => !toDelete.has(lid))
        if (filtered.length !== n.linkedNodeIds.length) {
          let labelIds = n.labelIds
          // If this is the original and its today's copy was deleted, remove today label
          if (state.todaysTasksLabelId && !filtered.some(lid => state.nodes[lid]?.isTodaysTask)) {
            labelIds = labelIds.filter(lid => lid !== state.todaysTasksLabelId)
          }
          newNodes[nid] = { ...n, linkedNodeIds: filtered, labelIds }
        }
      })

      // Remove from parent
      if (node.parentId && !toDelete.has(node.parentId)) {
        const parent = newNodes[node.parentId]
        if (parent) {
          newNodes[node.parentId] = {
            ...parent,
            childrenIds: parent.childrenIds.filter(c => c !== id),
          }
        }
      }

      // Remove all collected _today copies from their parents
      toDelete.forEach(tid => {
        const t = state.nodes[tid]
        if (!t?.isTodaysTask) return
        if (toDelete.has(t.parentId)) return // parent also being deleted
        const parent = newNodes[t.parentId]
        if (parent) {
          newNodes[t.parentId] = {
            ...parent,
            childrenIds: parent.childrenIds.filter(c => c !== tid),
          }
        }
      })

      const newRootOrder = state.rootOrder.filter(rid => !toDelete.has(rid))
      const newTodaysTasksRootId =
        state.todaysTasksRootId && toDelete.has(state.todaysTasksRootId)
          ? null
          : state.todaysTasksRootId

      return { nodes: newNodes, rootOrder: newRootOrder, todaysTasksRootId: newTodaysTasksRootId, deletedNodes: newDeletedNodes }
    })
  },

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  moveNode({ nodeId, newParentId, newIndex }) {
    get()._pushSnapshot()
    set(state => {
      const node = state.nodes[nodeId]
      if (!node) return {}
      const newNodes = { ...state.nodes }
      const newRootOrder = [...state.rootOrder]
      const ts = Date.now()
      let rootOrderUpdatedAt = state.rootOrderUpdatedAt

      // Remove from old location
      if (node.parentId) {
        const oldParent = { ...newNodes[node.parentId], updatedAt: ts }
        oldParent.childrenIds = oldParent.childrenIds.filter(c => c !== nodeId)
        newNodes[node.parentId] = oldParent
      } else {
        const idx = newRootOrder.indexOf(nodeId)
        if (idx !== -1) newRootOrder.splice(idx, 1)
        rootOrderUpdatedAt = ts
      }

      // Insert into new location
      if (newParentId === null) {
        newRootOrder.splice(newIndex, 0, nodeId)
        newNodes[nodeId] = { ...node, parentId: null }
        rootOrderUpdatedAt = ts
      } else {
        const newParent = { ...newNodes[newParentId], updatedAt: ts }
        const children = [...newParent.childrenIds]
        children.splice(newIndex, 0, nodeId)
        newParent.childrenIds = children
        newNodes[newParentId] = newParent
        newNodes[nodeId] = { ...node, parentId: newParentId }
      }

      return { nodes: newNodes, rootOrder: newRootOrder, rootOrderUpdatedAt }
    })
  },

  reorderRootCards(oldIndex, newIndex) {
    get()._pushSnapshot()
    set(state => {
      const newRootOrder = [...state.rootOrder]
      const [moved] = newRootOrder.splice(oldIndex, 1)
      newRootOrder.splice(newIndex, 0, moved)
      return { rootOrder: newRootOrder, rootOrderUpdatedAt: Date.now() }
    })
  },

  reorderChildren(parentId, oldIndex, newIndex) {
    get()._pushSnapshot()
    set(state => {
      const parent = state.nodes[parentId]
      if (!parent) return {}
      const children = [...parent.childrenIds]
      const [moved] = children.splice(oldIndex, 1)
      children.splice(newIndex, 0, moved)
      return {
        nodes: { ...state.nodes, [parentId]: { ...parent, childrenIds: children, updatedAt: Date.now() } },
      }
    })
  },

  // Link a node as a Today's Task (copies node reference, shares state)
  linkToTodaysTasks(nodeId) {
    set(state => {
      const todaysId = state.todaysTasksRootId
      if (!todaysId) return {}
      const node = state.nodes[nodeId]
      if (!node) return {}

      // Guard: already linked to today's tasks
      const existingTodayLinkId = node.linkedNodeIds.find(lid => state.nodes[lid]?.isTodaysTask)
      if (existingTodayLinkId) {
        // Upgrade auto-group node to explicit if the user explicitly adds it
        if (state.nodes[existingTodayLinkId]?.isAutoGroupNode) {
          const todayLabelId = state.todaysTasksLabelId
          return {
            nodes: {
              ...state.nodes,
              [existingTodayLinkId]: { ...state.nodes[existingTodayLinkId], isAutoGroupNode: false },
              [nodeId]: todayLabelId
                ? { ...node, labelIds: [...new Set([...node.labelIds, todayLabelId])] }
                : node,
            },
          }
        }
        return {}
      }

      if (!state.nodes[todaysId]) return {}

      // Work in newNodes (shallow copy; individual nodes replaced via spread when modified)
      const newNodes = { ...state.nodes }

      // Get ancestor chain [parent, grandparent, ..., rootCard] closest-first, includes root card
      function getAncestors(id) {
        const chain = []
        let cur = newNodes[id]
        while (cur?.parentId) {
          chain.push(cur.parentId)
          cur = newNodes[cur.parentId]
        }
        return chain
      }

      // Create an auto-group _today copy of ancestorId under groupParentId
      function createGroupNode(ancestorId, groupParentId) {
        const ancestor = newNodes[ancestorId]
        if (!ancestor) return
        const groupId = ancestorId + '_today'
        newNodes[groupId] = {
          ...ancestor,
          id: groupId,
          parentId: groupParentId,
          childrenIds: [],
          isTodaysTask: true,
          isTomorrowsTask: false,
          linkedNodeIds: [ancestorId],
          isAutoGroupNode: true,
        }
        newNodes[ancestorId] = {
          ...newNodes[ancestorId],
          linkedNodeIds: [...new Set([...newNodes[ancestorId].linkedNodeIds, groupId])],
        }
      }

      // Get path from ancestor to targetId: [child1, ..., targetId] (excludes ancestor itself)
      function getPathToNode(ancestorId, targetId) {
        const path = []
        let cur = newNodes[targetId]
        while (cur && cur.id !== ancestorId) {
          path.unshift(cur.id)
          if (!cur.parentId) break
          cur = newNodes[cur.parentId]
        }
        return path
      }

      // Check if origId is a strict descendant of ancestorId
      function isDescendantOf(origId, ancestorId) {
        let cur = newNodes[origId]
        while (cur?.parentId) {
          if (cur.parentId === ancestorId) return true
          cur = newNodes[cur.parentId]
        }
        return false
      }

      // Recursively create _today linked copies for originalId and all descendants
      function createLinkedTree(originalId, todayParentId) {
        const original = newNodes[originalId]
        if (!original) return
        const linkedId = originalId + '_today'
        newNodes[originalId] = {
          ...newNodes[originalId],
          linkedNodeIds: [...new Set([...newNodes[originalId].linkedNodeIds, linkedId])],
        }
        const linkedChildIds = original.childrenIds.map(childId => {
          createLinkedTree(childId, linkedId)
          return childId + '_today'
        })
        newNodes[linkedId] = {
          ...original,
          id: linkedId,
          parentId: todayParentId,
          childrenIds: linkedChildIds,
          isTodaysTask: true,
          isTomorrowsTask: false,
          linkedNodeIds: [originalId],
          isAutoGroupNode: false,
        }
      }

      // Ensure group nodes exist from commonAncestorId down to targetNodeId's parent.
      // Returns the _today id that should be targetNodeId's direct parent.
      function ensureGroupHierarchy(commonAncestorId, commonAncestorTodayId, targetNodeId) {
        const pathToNode = getPathToNode(commonAncestorId, targetNodeId)
        let parentTodayId = commonAncestorTodayId
        for (let i = 0; i < pathToNode.length - 1; i++) {
          const stepId = pathToNode[i]
          const stepTodayId = stepId + '_today'
          if (!newNodes[stepTodayId]) {
            createGroupNode(stepId, parentTodayId)
            newNodes[parentTodayId] = {
              ...newNodes[parentTodayId],
              childrenIds: [...newNodes[parentTodayId].childrenIds, stepTodayId],
            }
          }
          parentTodayId = stepTodayId
        }
        return parentTodayId
      }

      const nodeAncestors = getAncestors(nodeId)

      // Branch 1: an ancestor of nodeId already has a _today copy — nest under it
      let placed = false
      for (const ancestorId of nodeAncestors) {
        const ancestorTodayId = ancestorId + '_today'
        if (newNodes[ancestorTodayId]?.isTodaysTask) {
          const parentTodayId = ensureGroupHierarchy(ancestorId, ancestorTodayId, nodeId)
          createLinkedTree(nodeId, parentTodayId)
          newNodes[parentTodayId] = {
            ...newNodes[parentTodayId],
            childrenIds: [...newNodes[parentTodayId].childrenIds, nodeId + '_today'],
          }
          placed = true
          break
        }
      }

      if (!placed) {
        // Branch 2: find deepest common ancestor with any existing Today root child
        let commonAncestorId = null
        for (const childId of newNodes[todaysId].childrenIds) {
          const child = newNodes[childId]
          if (!child?.linkedNodeIds?.length) continue
          const origId = child.linkedNodeIds[0]
          const origWithAncestors = [origId, ...getAncestors(origId)]
          const found = nodeAncestors.find(a => origWithAncestors.includes(a))
          if (found) {
            if (!commonAncestorId || nodeAncestors.indexOf(found) < nodeAncestors.indexOf(commonAncestorId)) {
              commonAncestorId = found
            }
          }
        }

        if (commonAncestorId) {
          // Determine the outermost group node (direct child of Today root = root card ancestor)
          const commonAncestorAncestors = getAncestors(commonAncestorId)
          const outermostGroupId = newNodes[commonAncestorId]?.parentId
            ? commonAncestorAncestors[commonAncestorAncestors.length - 1]
            : commonAncestorId
          const outermostTodayId = outermostGroupId + '_today'

          // Create outermost group at Today root if needed
          if (!newNodes[outermostTodayId]) {
            createGroupNode(outermostGroupId, todaysId)
            newNodes[todaysId] = {
              ...newNodes[todaysId],
              childrenIds: [...newNodes[todaysId].childrenIds, outermostTodayId],
            }
          }

          // Create group nodes from outermost down to commonAncestor
          let caParentTodayId = outermostTodayId
          if (outermostGroupId !== commonAncestorId) {
            const pathToCA = getPathToNode(outermostGroupId, commonAncestorId)
            for (const stepId of pathToCA) {
              const stepTodayId = stepId + '_today'
              if (!newNodes[stepTodayId]) {
                createGroupNode(stepId, caParentTodayId)
                newNodes[caParentTodayId] = {
                  ...newNodes[caParentTodayId],
                  childrenIds: [...newNodes[caParentTodayId].childrenIds, stepTodayId],
                }
              }
              caParentTodayId = stepTodayId
            }
          }

          // Place nodeId_today in the hierarchy
          const parentTodayId = ensureGroupHierarchy(commonAncestorId, caParentTodayId, nodeId)
          createLinkedTree(nodeId, parentTodayId)
          newNodes[parentTodayId] = {
            ...newNodes[parentTodayId],
            childrenIds: [...newNodes[parentTodayId].childrenIds, nodeId + '_today'],
          }

          // Retroactive merge: move existing Today root children that belong under outermostGroup
          const toMoveIds = newNodes[todaysId].childrenIds.filter(childId => {
            if (childId === outermostTodayId) return false
            const child = newNodes[childId]
            if (!child?.linkedNodeIds?.length) return false
            const origId = child.linkedNodeIds[0]
            return origId === outermostGroupId || isDescendantOf(origId, outermostGroupId)
          })

          for (const childId of toMoveIds) {
            const child = newNodes[childId]
            const origId = child.linkedNodeIds[0]
            const pathToOrig = getPathToNode(outermostGroupId, origId)
            let siblingParentTodayId = outermostTodayId
            for (let i = 0; i < pathToOrig.length - 1; i++) {
              const stepId = pathToOrig[i]
              const stepTodayId = stepId + '_today'
              if (!newNodes[stepTodayId]) {
                createGroupNode(stepId, siblingParentTodayId)
                newNodes[siblingParentTodayId] = {
                  ...newNodes[siblingParentTodayId],
                  childrenIds: [...newNodes[siblingParentTodayId].childrenIds, stepTodayId],
                }
              }
              siblingParentTodayId = stepTodayId
            }
            newNodes[childId] = { ...newNodes[childId], parentId: siblingParentTodayId }
            newNodes[siblingParentTodayId] = {
              ...newNodes[siblingParentTodayId],
              childrenIds: [...newNodes[siblingParentTodayId].childrenIds, childId],
            }
          }

          if (toMoveIds.length > 0) {
            const toMoveSet = new Set(toMoveIds)
            newNodes[todaysId] = {
              ...newNodes[todaysId],
              childrenIds: newNodes[todaysId].childrenIds.filter(id => !toMoveSet.has(id)),
            }
          }
        } else {
          // Branch 3: no common ancestor — standard placement at Today root
          createLinkedTree(nodeId, todaysId)
          newNodes[todaysId] = {
            ...newNodes[todaysId],
            childrenIds: [...newNodes[todaysId].childrenIds, nodeId + '_today'],
          }
        }
      }

      // Apply today label to root original only
      const todayLabelId = state.todaysTasksLabelId
      if (todayLabelId) {
        newNodes[nodeId] = {
          ...newNodes[nodeId],
          labelIds: [...new Set([...newNodes[nodeId].labelIds, todayLabelId])],
        }
      }

      return { nodes: newNodes }
    })
  },

  // Remove a linked today's copy and clean up the original (recursively for all descendants)
  unlinkFromTodaysTasks(linkedNodeId) {
    set(state => {
      const linkedNode = state.nodes[linkedNodeId]
      if (!linkedNode || !linkedNode.isTodaysTask) return {}

      const newNodes = { ...state.nodes }

      // Remove this copy from its parent's childrenIds
      const parentId = linkedNode.parentId
      if (parentId && newNodes[parentId]) {
        newNodes[parentId] = {
          ...newNodes[parentId],
          childrenIds: newNodes[parentId].childrenIds.filter(c => c !== linkedNodeId),
        }
      }

      // Collect all _today descendants to delete
      const toDelete = new Set()
      const collect = (nid) => {
        const n = newNodes[nid]
        if (!n) return
        toDelete.add(nid)
        n.childrenIds.forEach(collect)
      }
      collect(linkedNodeId)

      // Clean up linkedNodeIds on all originals; remove today label from any original that has it
      toDelete.forEach(tid => {
        const todayCopy = newNodes[tid]
        if (!todayCopy) return
        todayCopy.linkedNodeIds.forEach(originalId => {
          const original = newNodes[originalId]
          if (!original) return
          const filteredLinks = original.linkedNodeIds.filter(lid => lid !== tid)
          let { labelIds } = original
          if (state.todaysTasksLabelId && labelIds.includes(state.todaysTasksLabelId)) {
            labelIds = labelIds.filter(lid => lid !== state.todaysTasksLabelId)
          }
          newNodes[originalId] = { ...original, linkedNodeIds: filteredLinks, labelIds }
        })
      })

      // Delete all collected _today nodes + tombstone them
      const deletedAt = Date.now()
      const newDeletedNodes = { ...state.deletedNodes }
      toDelete.forEach(tid => {
        delete newNodes[tid]
        newDeletedNodes[tid] = { deletedAt }
      })

      // Auto-cleanup: cascade-remove empty auto-group ancestors
      let checkParentId = parentId
      while (checkParentId && checkParentId !== state.todaysTasksRootId) {
        const checkParent = newNodes[checkParentId]
        if (!checkParent || !checkParent.isAutoGroupNode || checkParent.childrenIds.length > 0) break
        const grandParentId = checkParent.parentId
        if (grandParentId && newNodes[grandParentId]) {
          newNodes[grandParentId] = {
            ...newNodes[grandParentId],
            childrenIds: newNodes[grandParentId].childrenIds.filter(c => c !== checkParentId),
          }
        }
        checkParent.linkedNodeIds.forEach(origId => {
          if (newNodes[origId]) {
            newNodes[origId] = {
              ...newNodes[origId],
              linkedNodeIds: newNodes[origId].linkedNodeIds.filter(lid => lid !== checkParentId),
            }
          }
        })
        delete newNodes[checkParentId]
        newDeletedNodes[checkParentId] = { deletedAt }
        checkParentId = grandParentId
      }

      return { nodes: newNodes, deletedNodes: newDeletedNodes }
    })
  },

  // Link a node as a Tomorrow's Task (mirror of linkToTodaysTasks)
  linkToTomorrowsTasks(nodeId) {
    set(state => {
      const tomorrowsId = state.tomorrowsTasksRootId
      if (!tomorrowsId) return {}
      const node = state.nodes[nodeId]
      if (!node) return {}

      // Guard: already linked to tomorrow's tasks
      const existingTomorrowLinkId = node.linkedNodeIds.find(lid => state.nodes[lid]?.isTomorrowsTask)
      if (existingTomorrowLinkId) {
        // Upgrade auto-group node to explicit if the user explicitly adds it
        if (state.nodes[existingTomorrowLinkId]?.isAutoGroupNode) {
          const tomorrowLabelId = state.tomorrowsTasksLabelId
          return {
            nodes: {
              ...state.nodes,
              [existingTomorrowLinkId]: { ...state.nodes[existingTomorrowLinkId], isAutoGroupNode: false },
              [nodeId]: tomorrowLabelId
                ? { ...node, labelIds: [...new Set([...node.labelIds, tomorrowLabelId])] }
                : node,
            },
          }
        }
        return {}
      }

      if (!state.nodes[tomorrowsId]) return {}

      const newNodes = { ...state.nodes }

      function getAncestors(id) {
        const chain = []
        let cur = newNodes[id]
        while (cur?.parentId) {
          chain.push(cur.parentId)
          cur = newNodes[cur.parentId]
        }
        return chain
      }

      function createGroupNode(ancestorId, groupParentId) {
        const ancestor = newNodes[ancestorId]
        if (!ancestor) return
        const groupId = ancestorId + '_tomorrow'
        newNodes[groupId] = {
          ...ancestor,
          id: groupId,
          parentId: groupParentId,
          childrenIds: [],
          isTomorrowsTask: true,
          isTodaysTask: false,
          linkedNodeIds: [ancestorId],
          isAutoGroupNode: true,
        }
        newNodes[ancestorId] = {
          ...newNodes[ancestorId],
          linkedNodeIds: [...new Set([...newNodes[ancestorId].linkedNodeIds, groupId])],
        }
      }

      function getPathToNode(ancestorId, targetId) {
        const path = []
        let cur = newNodes[targetId]
        while (cur && cur.id !== ancestorId) {
          path.unshift(cur.id)
          if (!cur.parentId) break
          cur = newNodes[cur.parentId]
        }
        return path
      }

      function isDescendantOf(origId, ancestorId) {
        let cur = newNodes[origId]
        while (cur?.parentId) {
          if (cur.parentId === ancestorId) return true
          cur = newNodes[cur.parentId]
        }
        return false
      }

      function createLinkedTree(originalId, tomorrowParentId) {
        const original = newNodes[originalId]
        if (!original) return
        const linkedId = originalId + '_tomorrow'
        newNodes[originalId] = {
          ...newNodes[originalId],
          linkedNodeIds: [...new Set([...newNodes[originalId].linkedNodeIds, linkedId])],
        }
        const linkedChildIds = original.childrenIds.map(childId => {
          createLinkedTree(childId, linkedId)
          return childId + '_tomorrow'
        })
        newNodes[linkedId] = {
          ...original,
          id: linkedId,
          parentId: tomorrowParentId,
          childrenIds: linkedChildIds,
          isTomorrowsTask: true,
          isTodaysTask: false,
          linkedNodeIds: [originalId],
          isAutoGroupNode: false,
        }
      }

      function ensureGroupHierarchy(commonAncestorId, commonAncestorTomorrowId, targetNodeId) {
        const pathToNode = getPathToNode(commonAncestorId, targetNodeId)
        let parentTomorrowId = commonAncestorTomorrowId
        for (let i = 0; i < pathToNode.length - 1; i++) {
          const stepId = pathToNode[i]
          const stepTomorrowId = stepId + '_tomorrow'
          if (!newNodes[stepTomorrowId]) {
            createGroupNode(stepId, parentTomorrowId)
            newNodes[parentTomorrowId] = {
              ...newNodes[parentTomorrowId],
              childrenIds: [...newNodes[parentTomorrowId].childrenIds, stepTomorrowId],
            }
          }
          parentTomorrowId = stepTomorrowId
        }
        return parentTomorrowId
      }

      const nodeAncestors = getAncestors(nodeId)

      // Branch 1: an ancestor already has a _tomorrow copy — nest under it
      let placed = false
      for (const ancestorId of nodeAncestors) {
        const ancestorTomorrowId = ancestorId + '_tomorrow'
        if (newNodes[ancestorTomorrowId]?.isTomorrowsTask) {
          const parentTomorrowId = ensureGroupHierarchy(ancestorId, ancestorTomorrowId, nodeId)
          createLinkedTree(nodeId, parentTomorrowId)
          newNodes[parentTomorrowId] = {
            ...newNodes[parentTomorrowId],
            childrenIds: [...newNodes[parentTomorrowId].childrenIds, nodeId + '_tomorrow'],
          }
          placed = true
          break
        }
      }

      if (!placed) {
        // Branch 2: find deepest common ancestor with any existing Tomorrow root child
        let commonAncestorId = null
        for (const childId of newNodes[tomorrowsId].childrenIds) {
          const child = newNodes[childId]
          if (!child?.linkedNodeIds?.length) continue
          const origId = child.linkedNodeIds[0]
          const origWithAncestors = [origId, ...getAncestors(origId)]
          const found = nodeAncestors.find(a => origWithAncestors.includes(a))
          if (found) {
            if (!commonAncestorId || nodeAncestors.indexOf(found) < nodeAncestors.indexOf(commonAncestorId)) {
              commonAncestorId = found
            }
          }
        }

        if (commonAncestorId) {
          const commonAncestorAncestors = getAncestors(commonAncestorId)
          const outermostGroupId = newNodes[commonAncestorId]?.parentId
            ? commonAncestorAncestors[commonAncestorAncestors.length - 1]
            : commonAncestorId
          const outermostTomorrowId = outermostGroupId + '_tomorrow'

          if (!newNodes[outermostTomorrowId]) {
            createGroupNode(outermostGroupId, tomorrowsId)
            newNodes[tomorrowsId] = {
              ...newNodes[tomorrowsId],
              childrenIds: [...newNodes[tomorrowsId].childrenIds, outermostTomorrowId],
            }
          }

          let caParentTomorrowId = outermostTomorrowId
          if (outermostGroupId !== commonAncestorId) {
            const pathToCA = getPathToNode(outermostGroupId, commonAncestorId)
            for (const stepId of pathToCA) {
              const stepTomorrowId = stepId + '_tomorrow'
              if (!newNodes[stepTomorrowId]) {
                createGroupNode(stepId, caParentTomorrowId)
                newNodes[caParentTomorrowId] = {
                  ...newNodes[caParentTomorrowId],
                  childrenIds: [...newNodes[caParentTomorrowId].childrenIds, stepTomorrowId],
                }
              }
              caParentTomorrowId = stepTomorrowId
            }
          }

          const parentTomorrowId = ensureGroupHierarchy(commonAncestorId, caParentTomorrowId, nodeId)
          createLinkedTree(nodeId, parentTomorrowId)
          newNodes[parentTomorrowId] = {
            ...newNodes[parentTomorrowId],
            childrenIds: [...newNodes[parentTomorrowId].childrenIds, nodeId + '_tomorrow'],
          }

          const toMoveIds = newNodes[tomorrowsId].childrenIds.filter(childId => {
            if (childId === outermostTomorrowId) return false
            const child = newNodes[childId]
            if (!child?.linkedNodeIds?.length) return false
            const origId = child.linkedNodeIds[0]
            return origId === outermostGroupId || isDescendantOf(origId, outermostGroupId)
          })

          for (const childId of toMoveIds) {
            const child = newNodes[childId]
            const origId = child.linkedNodeIds[0]
            const pathToOrig = getPathToNode(outermostGroupId, origId)
            let siblingParentTomorrowId = outermostTomorrowId
            for (let i = 0; i < pathToOrig.length - 1; i++) {
              const stepId = pathToOrig[i]
              const stepTomorrowId = stepId + '_tomorrow'
              if (!newNodes[stepTomorrowId]) {
                createGroupNode(stepId, siblingParentTomorrowId)
                newNodes[siblingParentTomorrowId] = {
                  ...newNodes[siblingParentTomorrowId],
                  childrenIds: [...newNodes[siblingParentTomorrowId].childrenIds, stepTomorrowId],
                }
              }
              siblingParentTomorrowId = stepTomorrowId
            }
            newNodes[childId] = { ...newNodes[childId], parentId: siblingParentTomorrowId }
            newNodes[siblingParentTomorrowId] = {
              ...newNodes[siblingParentTomorrowId],
              childrenIds: [...newNodes[siblingParentTomorrowId].childrenIds, childId],
            }
          }

          if (toMoveIds.length > 0) {
            const toMoveSet = new Set(toMoveIds)
            newNodes[tomorrowsId] = {
              ...newNodes[tomorrowsId],
              childrenIds: newNodes[tomorrowsId].childrenIds.filter(id => !toMoveSet.has(id)),
            }
          }
        } else {
          // Branch 3: no common ancestor — standard placement at Tomorrow root
          createLinkedTree(nodeId, tomorrowsId)
          newNodes[tomorrowsId] = {
            ...newNodes[tomorrowsId],
            childrenIds: [...newNodes[tomorrowsId].childrenIds, nodeId + '_tomorrow'],
          }
        }
      }

      // Apply tomorrow label to root original only
      const tomorrowLabelId = state.tomorrowsTasksLabelId
      if (tomorrowLabelId) {
        newNodes[nodeId] = {
          ...newNodes[nodeId],
          labelIds: [...new Set([...newNodes[nodeId].labelIds, tomorrowLabelId])],
        }
      }

      return { nodes: newNodes }
    })
  },

  // Remove a linked tomorrow's copy and clean up the original
  unlinkFromTomorrowsTasks(linkedNodeId) {
    set(state => {
      const linkedNode = state.nodes[linkedNodeId]
      if (!linkedNode || !linkedNode.isTomorrowsTask) return {}

      const newNodes = { ...state.nodes }

      // Remove this copy from its parent's childrenIds
      const parentId = linkedNode.parentId
      if (parentId && newNodes[parentId]) {
        newNodes[parentId] = {
          ...newNodes[parentId],
          childrenIds: newNodes[parentId].childrenIds.filter(c => c !== linkedNodeId),
        }
      }

      // Collect all _tomorrow descendants to delete
      const toDelete = new Set()
      const collect = (nid) => {
        const n = newNodes[nid]
        if (!n) return
        toDelete.add(nid)
        n.childrenIds.forEach(collect)
      }
      collect(linkedNodeId)

      // Clean up linkedNodeIds on all originals; remove tomorrow label from any original that has it
      toDelete.forEach(tid => {
        const tomorrowCopy = newNodes[tid]
        if (!tomorrowCopy) return
        tomorrowCopy.linkedNodeIds.forEach(originalId => {
          const original = newNodes[originalId]
          if (!original) return
          const filteredLinks = original.linkedNodeIds.filter(lid => lid !== tid)
          let { labelIds } = original
          if (state.tomorrowsTasksLabelId && labelIds.includes(state.tomorrowsTasksLabelId)) {
            labelIds = labelIds.filter(lid => lid !== state.tomorrowsTasksLabelId)
          }
          newNodes[originalId] = { ...original, linkedNodeIds: filteredLinks, labelIds }
        })
      })

      // Delete all collected _tomorrow nodes + tombstone them
      const deletedAt = Date.now()
      const newDeletedNodes = { ...state.deletedNodes }
      toDelete.forEach(tid => {
        delete newNodes[tid]
        newDeletedNodes[tid] = { deletedAt }
      })

      // Auto-cleanup: cascade-remove empty auto-group ancestors
      let checkParentId = parentId
      while (checkParentId && checkParentId !== state.tomorrowsTasksRootId) {
        const checkParent = newNodes[checkParentId]
        if (!checkParent || !checkParent.isAutoGroupNode || checkParent.childrenIds.length > 0) break
        const grandParentId = checkParent.parentId
        if (grandParentId && newNodes[grandParentId]) {
          newNodes[grandParentId] = {
            ...newNodes[grandParentId],
            childrenIds: newNodes[grandParentId].childrenIds.filter(c => c !== checkParentId),
          }
        }
        checkParent.linkedNodeIds.forEach(origId => {
          if (newNodes[origId]) {
            newNodes[origId] = {
              ...newNodes[origId],
              linkedNodeIds: newNodes[origId].linkedNodeIds.filter(lid => lid !== checkParentId),
            }
          }
        })
        delete newNodes[checkParentId]
        newDeletedNodes[checkParentId] = { deletedAt }
        checkParentId = grandParentId
      }

      return { nodes: newNodes, deletedNodes: newDeletedNodes }
    })
  },

  // ── Labels ─────────────────────────────────────────────────────────────────
  addLabel(attrs = {}) {
    const label = createLabel(attrs)
    set(state => ({ labels: { ...state.labels, [label.id]: label } }))
    return label.id
  },

  updateLabel(id, patch) {
    set(state => {
      const label = state.labels[id]
      if (!label) return {}
      return { labels: { ...state.labels, [id]: { ...label, ...patch } } }
    })
  },

  deleteLabel(id) {
    set(state => {
      const newLabels = { ...state.labels }
      delete newLabels[id]
      // Remove label from all nodes
      const newNodes = {}
      Object.entries(state.nodes).forEach(([nid, node]) => {
        newNodes[nid] = node.labelIds.includes(id)
          ? { ...node, labelIds: node.labelIds.filter(l => l !== id) }
          : node
      })
      const newFilters = { ...state.activeFilters }
      delete newFilters[id]
      return { labels: newLabels, nodes: newNodes, activeFilters: newFilters }
    })
  },

  toggleLabelOnNode(nodeId, labelId) {
    // Handle Today label specially — drives Today's Tasks linking
    if (labelId === SYSTEM_TODAY_LABEL_ID) {
      const state = get()
      const node = state.nodes[nodeId]
      if (!node) return
      const hasLabel = node.labelIds.includes(labelId)
      if (hasLabel) {
        // Remove Today label → unlink from Today's Tasks
        const linkedId = node.linkedNodeIds.find(lid => state.nodes[lid]?.isTodaysTask)
        if (linkedId) {
          get().unlinkFromTodaysTasks(linkedId)
        } else {
          // Edge case: label present but no linked copy — just remove the label
          set(s => {
            const n = s.nodes[nodeId]
            if (!n) return {}
            return { nodes: { ...s.nodes, [nodeId]: { ...n, labelIds: n.labelIds.filter(l => l !== labelId) } } }
          })
        }
      } else {
        // Add Today label → create Today's Tasks card if needed, then link
        if (!get().todaysTasksRootId) get().addTodaysTasksCard()
        get().linkToTodaysTasks(nodeId)
      }
      return
    }
    // Handle Tomorrow label specially — drives Tomorrow's Tasks linking
    if (labelId === SYSTEM_TOMORROW_LABEL_ID) {
      const state = get()
      const node = state.nodes[nodeId]
      if (!node) return
      const hasLabel = node.labelIds.includes(labelId)
      if (hasLabel) {
        // Remove Tomorrow label → unlink from Tomorrow's Tasks
        const linkedId = node.linkedNodeIds.find(lid => state.nodes[lid]?.isTomorrowsTask)
        if (linkedId) {
          get().unlinkFromTomorrowsTasks(linkedId)
        } else {
          set(s => {
            const n = s.nodes[nodeId]
            if (!n) return {}
            return { nodes: { ...s.nodes, [nodeId]: { ...n, labelIds: n.labelIds.filter(l => l !== labelId) } } }
          })
        }
      } else {
        // Add Tomorrow label → create Tomorrow's Tasks card if needed, then link
        if (!get().tomorrowsTasksRootId) get().addTomorrowsTasksCard()
        get().linkToTomorrowsTasks(nodeId)
      }
      return
    }
    // Normal label toggle
    set(state => {
      const node = state.nodes[nodeId]
      if (!node) return {}
      const has = node.labelIds.includes(labelId)
      const labelIds = has
        ? node.labelIds.filter(l => l !== labelId)
        : [...node.labelIds, labelId]
      return { nodes: { ...state.nodes, [nodeId]: { ...node, labelIds, updatedAt: Date.now() } } }
    })
  },

  // ── Filters ────────────────────────────────────────────────────────────────
  setFilter(labelId, mode) {
    // mode: 'show' | 'hide' | null
    set(state => ({
      activeFilters: { ...state.activeFilters, [labelId]: mode },
    }))
  },

  clearFilters() {
    set({ activeFilters: {} })
  },

  // ── Card UI State ──────────────────────────────────────────────────────────
  toggleCardCollapse(nodeId) {
    set(s => ({
      collapsedCards: { ...s.collapsedCards, [nodeId]: !s.collapsedCards[nodeId] },
    }))
  },

  toggleCardPin(nodeId) {
    set(s => ({
      pinnedCards: { ...s.pinnedCards, [nodeId]: !s.pinnedCards[nodeId] },
    }))
  },

  toggleTodaysTasksCard() {
    const { todaysTasksRootId, rootOrder, addTodaysTasksCard } = get()
    if (!todaysTasksRootId) {
      addTodaysTasksCard()
    } else if (rootOrder.includes(todaysTasksRootId)) {
      set(s => ({ rootOrder: s.rootOrder.filter(id => id !== s.todaysTasksRootId) }))
    } else {
      set(s => ({ rootOrder: [s.todaysTasksRootId, ...s.rootOrder] }))
    }
  },

  toggleTomorrowsTasksCard() {
    const { tomorrowsTasksRootId, rootOrder, addTomorrowsTasksCard } = get()
    if (!tomorrowsTasksRootId) {
      addTomorrowsTasksCard()
    } else if (rootOrder.includes(tomorrowsTasksRootId)) {
      set(s => ({ rootOrder: s.rootOrder.filter(id => id !== s.tomorrowsTasksRootId) }))
    } else {
      // Re-insert after Today's Tasks card if present, else prepend
      set(s => {
        const order = [...s.rootOrder]
        const todayIdx = s.todaysTasksRootId ? order.indexOf(s.todaysTasksRootId) : -1
        if (todayIdx >= 0) {
          order.splice(todayIdx + 1, 0, s.tomorrowsTasksRootId)
        } else {
          order.unshift(s.tomorrowsTasksRootId)
        }
        return { rootOrder: order }
      })
    }
  },

  // ── UI State ───────────────────────────────────────────────────────────────
  openDetailsModal(nodeId) {
    set({ detailsModalNodeId: nodeId })
  },

  closeDetailsModal() {
    set({ detailsModalNodeId: null })
  },

  setShowDoneToday(val) {
    set({ showDoneToday: val })
  },

  setShowLabelManager(val) {
    set({ showLabelManager: val })
  },

  setSyncStatus(status) {
    set({ syncStatus: status })
  },

  // ── Daily Cleanup & History ─────────────────────────────────────────────────
  enterPeekMode() {
    set(s => ({ isPeeking: true, peekCardIds: new Set(s.rootOrder) }))
  },
  exitPeekMode() {
    set({ isPeeking: false, peekCardIds: null })
  },

  setShowHistory(val) {
    set({ showHistory: val })
  },

  setHistoryViewDate(date) {
    set({ historyViewDate: date })
  },

  setShowDemoModal(val) {
    set({ showDemoModal: val })
  },

  updateHistoryTask(snapshotId, taskId, content) {
    set(state => {
      const idx = state.history.findIndex(s => s.id === snapshotId)
      if (idx === -1) return {}
      const snapshot = state.history[idx]

      function patchTask(tasks) {
        return tasks.map(t => {
          if (t.id === taskId) return { ...t, content }
          if (t.children?.length) return { ...t, children: patchTask(t.children) }
          return t
        })
      }

      const newHistory = [...state.history]
      newHistory[idx] = { ...snapshot, tasks: patchTask(snapshot.tasks) }
      return { history: newHistory }
    })
  },

  markCompleteInPast(nodeId, date) {
    set(state => {
      const { nodes, history, rootOrder } = state
      const node = nodes[nodeId]
      if (!node) return {}

      // Serialize the task tree using original IDs
      const serialized = get()._serializeTaskTree(nodeId, nodes)
      if (!serialized) return {}

      // Override status to completed for the chosen past date
      const task = { ...serialized, status: 'COMPLETED', completedAt: date + 'T00:00:00.000Z' }

      // Find or create snapshot for date
      let newHistory = [...history]
      const existingIdx = newHistory.findIndex(s => s.date === date)
      if (existingIdx >= 0) {
        newHistory[existingIdx] = {
          ...newHistory[existingIdx],
          tasks: [...newHistory[existingIdx].tasks, task],
        }
      } else {
        newHistory.push(createHistorySnapshot(date, [task]))
      }

      // Collect all node IDs to delete (node + all descendants)
      const toDelete = new Set()
      const collect = (nid) => {
        if (!nodes[nid]) return
        toDelete.add(nid)
        nodes[nid].childrenIds.forEach(collect)
      }
      collect(nodeId)

      const newNodes = { ...nodes }

      // Update parent's childrenIds
      if (node.parentId) {
        const parent = newNodes[node.parentId]
        if (parent) {
          newNodes[node.parentId] = {
            ...parent,
            childrenIds: parent.childrenIds.filter(id => id !== nodeId),
          }
        }
      }

      const newRootOrder = node.parentId ? rootOrder : rootOrder.filter(id => id !== nodeId)

      const deletedAt = Date.now()
      const newDeletedNodes = { ...state.deletedNodes }
      toDelete.forEach(nid => {
        delete newNodes[nid]
        newDeletedNodes[nid] = { deletedAt }
      })

      return { nodes: newNodes, history: newHistory, rootOrder: newRootOrder, deletedNodes: newDeletedNodes }
    })
  },

  initCleanupDate(date) {
    set({ lastCleanupDate: date })
  },

  // Serialize a _today node's tree into a plain object snapshot (uses original IDs)
  _serializeTaskTree(nodeId, nodes) {
    const node = nodes[nodeId]
    if (!node) return null
    const originalId = node.isTodaysTask ? (node.linkedNodeIds[0] ?? nodeId) : nodeId
    const original = nodes[originalId] ?? node
    const children = node.childrenIds
      .map(cid => get()._serializeTaskTree(cid, nodes))
      .filter(Boolean)
    return {
      id: originalId,
      content: original.content,
      status: original.status,
      type: original.type,
      completedAt: original.completedAt,
      children,
    }
  },

  runDailyCleanup() {
    set(state => {
      const { nodes, todaysTasksRootId, lastCleanupDate, history } = state

      // If no Today's Tasks card and no Tomorrow's Tasks card with tasks, nothing to do
      if (!todaysTasksRootId && !state.tomorrowsTasksRootId) return {}

      let newNodes = { ...nodes }
      let newHistory = [...history]
      let newRootOrder = [...state.rootOrder]
      const newDeletedNodes = { ...state.deletedNodes }

      // ── Rollover Tomorrow's Tasks → Today's Tasks (silent) ──────────────────
      if (state.tomorrowsTasksRootId) {
        const tomorrowCard = newNodes[state.tomorrowsTasksRootId]
        if (tomorrowCard && tomorrowCard.childrenIds.length > 0) {
          // Ensure Today's Tasks card exists
          let todaysId = todaysTasksRootId
          if (!todaysId) {
            const newTodayNode = createNode({ parentId: null, content: "Today's Tasks" })
            newTodayNode.isTodaysTask = true
            newNodes[newTodayNode.id] = newTodayNode
            todaysId = newTodayNode.id
            newRootOrder = [todaysId, ...newRootOrder]
            // We will update state.todaysTasksRootId via the returned state below
          }

          const todayChildrenToAdd = []

          tomorrowCard.childrenIds.forEach(tomorrowCopyId => {
            const tomorrowCopy = newNodes[tomorrowCopyId]
            if (!tomorrowCopy) return
            const originalId = tomorrowCopy.linkedNodeIds[0]
            if (!originalId) return
            const original = newNodes[originalId]
            if (!original) return

            // 1. Collect all _tomorrow descendants to delete
            const toDelete = new Set()
            const collectDesc = (nid) => {
              const n = newNodes[nid]
              if (!n) return
              toDelete.add(nid)
              n.childrenIds.forEach(collectDesc)
            }
            collectDesc(tomorrowCopyId)

            // 2. Update original: remove Tomorrow label, remove stale _tomorrow links
            newNodes[originalId] = {
              ...original,
              labelIds: original.labelIds.filter(l => l !== state.tomorrowsTasksLabelId),
              linkedNodeIds: original.linkedNodeIds.filter(l => !toDelete.has(l)),
            }

            // 3. Create _today copies inline (mirror of linkToTodaysTasks logic)
            const nodeUpdates = {}
            const newTodayNodes = {}
            const isAutoGroup = tomorrowCopy.isAutoGroupNode ?? false

            function createLinkedTree(srcId, todayParentId, topLevel = false) {
              const src = nodeUpdates[srcId] || newNodes[srcId]
              if (!src) return
              const linkedId = srcId + '_today'

              nodeUpdates[srcId] = {
                ...src,
                linkedNodeIds: [...new Set([...src.linkedNodeIds, linkedId])],
              }

              const linkedChildIds = src.childrenIds.map(childId => {
                createLinkedTree(childId, linkedId)
                return childId + '_today'
              })

              newTodayNodes[linkedId] = {
                ...src,
                id: linkedId,
                parentId: todayParentId,
                childrenIds: linkedChildIds,
                isTodaysTask: true,
                isTomorrowsTask: false,
                linkedNodeIds: [srcId],
                isAutoGroupNode: topLevel ? isAutoGroup : false,
              }
            }

            createLinkedTree(originalId, todaysId, true)

            // 4. Add Today label to original (only for explicitly-added items, not auto-group nodes)
            if (!isAutoGroup) {
              const origAfterUpdate = nodeUpdates[originalId] || newNodes[originalId]
              nodeUpdates[originalId] = {
                ...origAfterUpdate,
                labelIds: [...new Set([...origAfterUpdate.labelIds, state.todaysTasksLabelId])],
              }
            }

            // Merge updates into newNodes
            Object.assign(newNodes, nodeUpdates, newTodayNodes)

            // Delete old _tomorrow copies + tombstone them
            const deletedAt = Date.now()
            toDelete.forEach(tid => {
              delete newNodes[tid]
              newDeletedNodes[tid] = { deletedAt }
            })

            todayChildrenToAdd.push(originalId + '_today')
          })

          // Update Today's Tasks card with new children
          const todaysCard = newNodes[todaysId]
          if (todaysCard) {
            newNodes[todaysId] = {
              ...todaysCard,
              childrenIds: [...todaysCard.childrenIds, ...todayChildrenToAdd],
            }
          }

          // Clear Tomorrow's Tasks card
          newNodes[state.tomorrowsTasksRootId] = { ...tomorrowCard, childrenIds: [] }

          // If we created a new Today's Tasks card, record its ID
          if (!todaysTasksRootId) {
            // Return early with updated state including new todaysTasksRootId
            // We'll set it via the returned patch below
            state = { ...state, todaysTasksRootId: todaysId }
          }
        }
      }

      // If there's still no Today's Tasks card, nothing more to do
      const activeTodaysId = state.todaysTasksRootId || (newNodes && Object.values(newNodes).find(n => n.isTodaysTask && n.parentId === null)?.id)
      if (!activeTodaysId) {
        return {
          nodes: newNodes,
          rootOrder: newRootOrder,
          lastCleanupDate: new Date().toISOString().split('T')[0],
          tomorrowsTasksRootId: state.tomorrowsTasksRootId,
          deletedNodes: newDeletedNodes,
        }
      }

      const todaysCard = newNodes[activeTodaysId]
      if (!todaysCard || todaysCard.childrenIds.length === 0) {
        return {
          nodes: newNodes,
          rootOrder: newRootOrder,
          lastCleanupDate: new Date().toISOString().split('T')[0],
          todaysTasksRootId: activeTodaysId,
          deletedNodes: newDeletedNodes,
        }
      }

      const yesterdayDate = lastCleanupDate // the date we're archiving

      const allCheckboxDescendantsComplete = (nodeId, skipSelf = false) => {
        const n = newNodes[nodeId]
        if (!n) return true
        if (!skipSelf && n.type === 'CHECKBOX' && n.status !== 'COMPLETED') return false
        return n.childrenIds.every(cid => allCheckboxDescendantsComplete(cid))
      }

      const completed = todaysCard.childrenIds.filter(id => {
        const n = newNodes[id]
        if (!n) return false
        // Auto-group nodes are "complete" when all their checkbox descendants are complete
        if (n.isAutoGroupNode) return allCheckboxDescendantsComplete(id, true)
        return n.status === 'COMPLETED' && allCheckboxDescendantsComplete(id)
      })
      const incomplete = todaysCard.childrenIds.filter(id => {
        const n = newNodes[id]
        // Auto-group nodes auto-stay (handled transitively); don't show in cleanup modal
        if (!n || n.isAutoGroupNode) return false
        return n.status !== 'COMPLETED'
        // root-complete-but-subtasks-open: intentionally in neither bucket → auto-stay
      })

      // Set up pending tasks (modal handles both completed and incomplete)
      let pendingCleanupTasks = null
      let newLastCleanupDate = state.lastCleanupDate

      const completedPending = completed.map(id => ({
        id,
        content: newNodes[id]?.content ?? '',
        originalId: newNodes[id]?.linkedNodeIds[0] ?? null,
        resolved: null, // 'repeat' | 'remove' | 'pushback'
        isCompleted: true,
      }))

      const incompletePending = incomplete.map(id => ({
        id,
        content: newNodes[id]?.content ?? '',
        originalId: newNodes[id]?.linkedNodeIds[0] ?? null,
        resolved: null, // 'today' | 'complete' | 'pushback'
        isCompleted: false,
      }))

      const allPending = [...completedPending, ...incompletePending]
      if (allPending.length > 0) {
        pendingCleanupTasks = allPending
      } else {
        newLastCleanupDate = new Date().toISOString().split('T')[0]
      }

      return {
        nodes: newNodes,
        rootOrder: newRootOrder,
        history: newHistory,
        lastCleanupDate: newLastCleanupDate,
        pendingCleanupTasks,
        todaysTasksRootId: activeTodaysId,
        deletedNodes: newDeletedNodes,
      }
    })
  },

  resolveCleanupTask(taskId, action) {
    set(state => {
      const pending = state.pendingCleanupTasks
      if (!pending) return {}
      return {
        pendingCleanupTasks: pending.map(t =>
          t.id === taskId ? { ...t, resolved: action } : t
        ),
      }
    })
  },

  finalizeDayCleanup() {
    set(state => {
      const { pendingCleanupTasks, nodes, todaysTasksRootId, lastCleanupDate, history } = state
      if (!pendingCleanupTasks) return {}

      let newNodes = { ...nodes }
      let newHistory = [...history]
      const today = new Date().toISOString().split('T')[0]
      const newDeletedNodes = { ...state.deletedNodes }
      const cleanupDeletedAt = Date.now()
      const yesterdayDate = lastCleanupDate

      const toArchive = []

      pendingCleanupTasks.forEach(task => {
        const { id: todayId, resolved, isCompleted } = task
        const todayNode = newNodes[todayId]
        if (!todayNode) return

        if (resolved === 'archive_repeat') {
          // Completed task: archive to history, reset both copies to incomplete, keep in Today's Tasks
          toArchive.push(todayId)
          newNodes[todayId] = { ...todayNode, status: 'INCOMPLETE', completedAt: undefined }
          const originalId = todayNode.linkedNodeIds[0]
          if (originalId && newNodes[originalId]) {
            newNodes[originalId] = { ...newNodes[originalId], status: 'INCOMPLETE', completedAt: undefined }
          }
          // Leave in Today's Tasks card — no removal needed
        } else if (resolved === 'complete_repeat') {
          // Incomplete task: mark as completed, archive to history, then reset to incomplete (repeat in today)
          const originalId = todayNode.linkedNodeIds[0]
          const original = newNodes[originalId]
          const now = new Date().toISOString()
          if (original) {
            newNodes[originalId] = { ...original, status: 'COMPLETED', completedAt: now }
          }
          // Keep completedAt on today copy so the archive snapshot can read it after the reset
          newNodes[todayId] = { ...todayNode, status: 'INCOMPLETE', completedAt: now }
          toArchive.push(todayId)
          // Reset original back to incomplete
          if (originalId && newNodes[originalId]) {
            newNodes[originalId] = { ...newNodes[originalId], status: 'INCOMPLETE', completedAt: undefined }
          }
          // Leave in Today's Tasks card — no removal needed
        } else if (resolved === 'complete_remove' || resolved === 'archive_remove') {
          // 'complete_remove': incomplete task marked done then fully removed
          // 'archive_remove': completed task archived and fully removed
          // Both archive, delete the _today copy, AND delete the original from its source card
          if (resolved === 'complete_remove') {
            // Mark completed (only needed for incomplete tasks being resolved as done)
            const originalId = todayNode.linkedNodeIds[0]
            const original = newNodes[originalId]
            const now = new Date().toISOString()
            if (original) {
              newNodes[originalId] = { ...original, status: 'COMPLETED', completedAt: now }
            }
            newNodes[todayId] = { ...todayNode, status: 'COMPLETED', completedAt: now }
          }
          toArchive.push(todayId)

          // Unlink from Today's card
          const todaysCardNode = newNodes[todaysTasksRootId]
          if (todaysCardNode) {
            newNodes[todaysTasksRootId] = {
              ...todaysCardNode,
              childrenIds: todaysCardNode.childrenIds.filter(c => c !== todayId),
            }
          }

          // Clean up _today descendants and collect original node ids to remove
          const toDelete = new Set()
          const collect = (nid) => {
            const n = newNodes[nid]
            if (!n) return
            toDelete.add(nid)
            n.childrenIds.forEach(collect)
          }
          collect(todayId)

          toDelete.forEach(tid => {
            const todayCopy = newNodes[tid]
            if (!todayCopy) return
            todayCopy.linkedNodeIds.forEach(oid => {
              const orig = newNodes[oid]
              if (!orig) return
              const filteredLinks = orig.linkedNodeIds.filter(lid => !toDelete.has(lid))
              let { labelIds } = orig
              if (state.todaysTasksLabelId && labelIds.includes(state.todaysTasksLabelId)) {
                labelIds = labelIds.filter(lid => lid !== state.todaysTasksLabelId)
              }
              newNodes[oid] = { ...orig, linkedNodeIds: filteredLinks, labelIds }
            })
            delete newNodes[tid]
            newDeletedNodes[tid] = { deletedAt: cleanupDeletedAt }
          })

          // Also remove the original node from its source card
          const originalId = todayNode.linkedNodeIds[0]
          if (originalId && newNodes[originalId]) {
            const sourceCardId = newNodes[originalId].parentId
            if (sourceCardId && newNodes[sourceCardId]) {
              newNodes[sourceCardId] = {
                ...newNodes[sourceCardId],
                childrenIds: newNodes[sourceCardId].childrenIds.filter(c => c !== originalId),
              }
            }
            delete newNodes[originalId]
            newDeletedNodes[originalId] = { deletedAt: cleanupDeletedAt }
          }
        } else if (resolved === 'pushback') {
          // Remove _today copy; if task was completed, also reset original to incomplete
          if (isCompleted) {
            toArchive.push(todayId)
            const originalId = todayNode.linkedNodeIds[0]
            if (originalId && newNodes[originalId]) {
              newNodes[originalId] = { ...newNodes[originalId], status: 'INCOMPLETE', completedAt: undefined }
            }
          }

          const toDelete = new Set()
          const collect = (nid) => {
            const n = newNodes[nid]
            if (!n) return
            toDelete.add(nid)
            n.childrenIds.forEach(collect)
          }
          collect(todayId)

          const todaysCardNode = newNodes[todaysTasksRootId]
          if (todaysCardNode) {
            newNodes[todaysTasksRootId] = {
              ...todaysCardNode,
              childrenIds: todaysCardNode.childrenIds.filter(c => c !== todayId),
            }
          }

          toDelete.forEach(tid => {
            const todayCopy = newNodes[tid]
            if (!todayCopy) return
            todayCopy.linkedNodeIds.forEach(oid => {
              const orig = newNodes[oid]
              if (!orig) return
              const filteredLinks = orig.linkedNodeIds.filter(lid => !toDelete.has(lid))
              let { labelIds } = orig
              if (state.todaysTasksLabelId && labelIds.includes(state.todaysTasksLabelId)) {
                labelIds = labelIds.filter(lid => lid !== state.todaysTasksLabelId)
              }
              newNodes[oid] = { ...orig, linkedNodeIds: filteredLinks, labelIds }
            })
            delete newNodes[tid]
            newDeletedNodes[tid] = { deletedAt: cleanupDeletedAt }
          })
        }
        // 'today': leave as-is, stays in Today's Tasks (incomplete tasks only)
      })

      // Archive resolved tasks (complete_repeat, complete_remove, archive_repeat, archive_remove, pushback for completed)
      if (toArchive.length > 0) {
        const snapshotTasks = toArchive.map(id => {
          const n = newNodes[id] ?? nodes[id]
          if (!n) return null
          const origId = n.linkedNodeIds[0] ?? id
          const orig = newNodes[origId] ?? nodes[origId] ?? n
          // For 'repeat' tasks, newNodes[origId].completedAt was reset to undefined;
          // fall back to the pre-cleanup value from nodes[] for the history record.
          const completedAt = orig.completedAt ?? nodes[origId]?.completedAt ?? n.completedAt
          return {
            id: origId,
            content: orig.content,
            status: 'COMPLETED',
            type: orig.type,
            completedAt,
            children: [],
          }
        }).filter(Boolean)

        const existingIdx = newHistory.findIndex(s => s.date === yesterdayDate)
        if (existingIdx >= 0) {
          newHistory[existingIdx] = {
            ...newHistory[existingIdx],
            tasks: [...newHistory[existingIdx].tasks, ...snapshotTasks],
          }
        } else {
          newHistory.push(createHistorySnapshot(yesterdayDate, snapshotTasks))
        }
      }

      return {
        nodes: newNodes,
        history: newHistory,
        lastCleanupDate: today,
        pendingCleanupTasks: null,
        deletedNodes: newDeletedNodes,
        isPeeking: false,
        peekCardIds: null,
      }
    })
  },

  clearDemoData() {
    const DEMO_CARD_ID = 'demo-card-seed-0000-0000-000000000001'
    const DEMO_TMRW_CARD_ID = 'demo-tmrw-card-0000-0000-000000000002'
    set(state => {
      const newNodes = { ...state.nodes }
      // Collect demo cards and all their descendants + linked copies
      const toDelete = new Set()
      const collect = (nid) => {
        if (toDelete.has(nid)) return
        const n = newNodes[nid]
        if (!n) return
        toDelete.add(nid)
        n.childrenIds.forEach(collect)
        n.linkedNodeIds.forEach(lid => { if (newNodes[lid]) collect(lid) })
      }
      if (newNodes[DEMO_CARD_ID]) collect(DEMO_CARD_ID)
      if (newNodes[DEMO_TMRW_CARD_ID]) collect(DEMO_TMRW_CARD_ID)

      toDelete.forEach(id => delete newNodes[id])

      // Clean up linkedNodeIds on surviving nodes
      Object.keys(newNodes).forEach(nid => {
        const n = newNodes[nid]
        if (!n.linkedNodeIds?.length) return
        const filtered = n.linkedNodeIds.filter(lid => !toDelete.has(lid))
        if (filtered.length !== n.linkedNodeIds.length) {
          let { labelIds } = n
          if (!filtered.some(lid => newNodes[lid]?.isTodaysTask)) {
            labelIds = labelIds.filter(lid => lid !== state.todaysTasksLabelId)
          }
          if (!filtered.some(lid => newNodes[lid]?.isTomorrowsTask)) {
            labelIds = labelIds.filter(lid => lid !== state.tomorrowsTasksLabelId)
          }
          newNodes[nid] = { ...n, linkedNodeIds: filtered, labelIds }
        }
      })

      // Remove demo tasks from Today's Tasks children
      const todaysId = state.todaysTasksRootId
      if (todaysId && newNodes[todaysId]) {
        newNodes[todaysId] = {
          ...newNodes[todaysId],
          childrenIds: newNodes[todaysId].childrenIds.filter(id => !toDelete.has(id)),
        }
      }

      // Remove demo tasks from Tomorrow's Tasks children
      const tomorrowsId = state.tomorrowsTasksRootId
      if (tomorrowsId && newNodes[tomorrowsId]) {
        newNodes[tomorrowsId] = {
          ...newNodes[tomorrowsId],
          childrenIds: newNodes[tomorrowsId].childrenIds.filter(id => !toDelete.has(id)),
        }
      }

      // Remove history snapshots that only contain demo content
      const demoContents = new Set(['Reviewed PR #42', 'Updated docs', 'Write unit tests', 'Fix login bug'])
      const newHistory = state.history.filter(snapshot =>
        !snapshot.tasks.every(t => demoContents.has(t.content))
      )

      const newRootOrder = state.rootOrder.filter(id => !toDelete.has(id))
      return { nodes: newNodes, rootOrder: newRootOrder, history: newHistory }
    })
  },

  enterDemoMode() {
    if (get().isDemoMode) return
    const { nodes, rootOrder, history, lastCleanupDate, todaysTasksRootId, tomorrowsTasksRootId } = get()
    set({
      savedRealData: { nodes, rootOrder, history, lastCleanupDate, todaysTasksRootId, tomorrowsTasksRootId },
      nodes: {},
      rootOrder: [],
      history: [],
      lastCleanupDate: null,
      todaysTasksRootId: null,
      tomorrowsTasksRootId: null,
      isDemoMode: true,
    })
    get().seedDemoTodaysTasks()
  },

  exitDemoMode() {
    const { savedRealData } = get()
    if (!savedRealData) {
      console.error('[exitDemoMode] savedRealData is null — real data cannot be restored. This should not happen.')
      get().clearDemoData()
      set({ isDemoMode: false, savedRealData: null })
      return
    }
    set({
      nodes: savedRealData.nodes,
      rootOrder: savedRealData.rootOrder,
      history: savedRealData.history,
      lastCleanupDate: savedRealData.lastCleanupDate,
      todaysTasksRootId: savedRealData.todaysTasksRootId ?? null,
      tomorrowsTasksRootId: savedRealData.tomorrowsTasksRootId ?? null,
      isDemoMode: false,
      savedRealData: null,
    })
  },

  seedDemoTodaysTasks() {
    // Ensure Today's Tasks card exists
    if (!get().todaysTasksRootId) get().addTodaysTasksCard()
    const todaysId = get().todaysTasksRootId
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    const pastTime = yesterday.toISOString()

    const demoSpec = [
      { content: 'Reviewed PR #42', status: 'COMPLETED', completedAt: pastTime },
      { content: 'Updated docs', status: 'COMPLETED', completedAt: pastTime },
      { content: 'Write unit tests', status: 'OPEN', completedAt: null },
      { content: 'Fix login bug', status: 'OPEN', completedAt: null },
    ]

    // Pre-generate IDs outside set()
    const demoCardId = 'demo-card-seed-0000-0000-000000000001'
    const entries = demoSpec.map((spec, i) => {
      const origId = `demo-task-orig-000${i}-000000000001`
      const todayId = origId + '_today'
      return { ...spec, origId, todayId }
    })

    set(state => {
      const newNodes = { ...state.nodes }
      const todaysCard = newNodes[todaysId]
      if (!todaysCard) return {}

      const newChildIds = [...todaysCard.childrenIds]
      const origIds = []

      entries.forEach(({ content, status, completedAt, origId, todayId }) => {
        origIds.push(origId)
        newNodes[origId] = {
          id: origId,
          parentId: demoCardId,
          childrenIds: [],
          type: 'CHECKBOX',
          status,
          content,
          uiState: { isExpanded: true, isFocusMode: false },
          labelIds: [state.todaysTasksLabelId],
          linkedNodeIds: [todayId],
          isTodaysTask: false,
          createdAt: pastTime,
          completedAt,
        }
        newNodes[todayId] = {
          id: todayId,
          parentId: todaysId,
          childrenIds: [],
          type: 'CHECKBOX',
          status,
          content,
          uiState: { isExpanded: true, isFocusMode: false },
          labelIds: [],
          linkedNodeIds: [origId],
          isTodaysTask: true,
          createdAt: pastTime,
          completedAt,
        }
        newChildIds.push(todayId)
      })

      // Demo card to hold the originals
      newNodes[demoCardId] = {
        id: demoCardId,
        parentId: null,
        childrenIds: origIds,
        type: 'CHECKBOX',
        status: 'OPEN',
        content: 'Demo Tasks',
        uiState: { isExpanded: true, isFocusMode: false },
        labelIds: [],
        linkedNodeIds: [],
        isTodaysTask: false,
        createdAt: pastTime,
        completedAt: null,
      }

      newNodes[todaysId] = { ...todaysCard, childrenIds: newChildIds }

      const newRootOrder = state.rootOrder.includes(demoCardId)
        ? state.rootOrder
        : [demoCardId, ...state.rootOrder]

      return { nodes: newNodes, rootOrder: newRootOrder }
    })
  },

  seedDemoTomorrowsTasks() {
    if (!get().tomorrowsTasksRootId) get().addTomorrowsTasksCard()
    const tomorrowsId = get().tomorrowsTasksRootId
    const now = new Date().toISOString()

    const demoSpec = [
      { content: 'Write weekly report', status: 'OPEN', completedAt: null },
      { content: 'Review Q1 budget', status: 'OPEN', completedAt: null },
      { content: 'Schedule team sync', status: 'OPEN', completedAt: null },
    ]

    const demTmrwCardId = 'demo-tmrw-card-0000-0000-000000000002'
    const entries = demoSpec.map((spec, i) => {
      const origId = `demo-tmrw-orig-000${i}-000000000002`
      const tomorrowId = origId + '_tomorrow'
      return { ...spec, origId, tomorrowId }
    })

    set(state => {
      const newNodes = { ...state.nodes }
      const tomorrowsCard = newNodes[tomorrowsId]
      if (!tomorrowsCard) return {}

      const newChildIds = [...tomorrowsCard.childrenIds]
      const origIds = []

      entries.forEach(({ content, status, completedAt, origId, tomorrowId }) => {
        origIds.push(origId)
        newNodes[origId] = {
          id: origId,
          parentId: demTmrwCardId,
          childrenIds: [],
          type: 'CHECKBOX',
          status,
          content,
          uiState: { isExpanded: true, isFocusMode: false },
          labelIds: [state.tomorrowsTasksLabelId],
          linkedNodeIds: [tomorrowId],
          isTodaysTask: false,
          isTomorrowsTask: false,
          createdAt: now,
          completedAt,
        }
        newNodes[tomorrowId] = {
          id: tomorrowId,
          parentId: tomorrowsId,
          childrenIds: [],
          type: 'CHECKBOX',
          status,
          content,
          uiState: { isExpanded: true, isFocusMode: false },
          labelIds: [],
          linkedNodeIds: [origId],
          isTodaysTask: false,
          isTomorrowsTask: true,
          createdAt: now,
          completedAt,
        }
        newChildIds.push(tomorrowId)
      })

      newNodes[demTmrwCardId] = {
        id: demTmrwCardId,
        parentId: null,
        childrenIds: origIds,
        type: 'CHECKBOX',
        status: 'OPEN',
        content: 'Demo Tasks (Tomorrow)',
        uiState: { isExpanded: true, isFocusMode: false },
        labelIds: [],
        linkedNodeIds: [],
        isTodaysTask: false,
        isTomorrowsTask: false,
        createdAt: now,
        completedAt: null,
      }

      newNodes[tomorrowsId] = { ...tomorrowsCard, childrenIds: newChildIds }

      const newRootOrder = state.rootOrder.includes(demTmrwCardId)
        ? state.rootOrder
        : [...state.rootOrder, demTmrwCardId]

      return { nodes: newNodes, rootOrder: newRootOrder }
    })
  },
}))

// Apply theme on load
const saved = loadFromCache()
if (saved) {
  useStore.getState().hydrate(saved)
}
const persistedUser = loadUser()
if (persistedUser) {
  console.log('[auth] restoring persisted user:', persistedUser.email)
  useStore.setState({ user: persistedUser })
} else {
  console.log('[auth] no persisted user found')
}
const currentTheme = useStore.getState().theme
document.documentElement.classList.toggle('dark', currentTheme === 'dark')
