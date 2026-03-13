import { create } from 'zustand'
import { createNode, createLabel } from '../types/index.js'
import { saveToCache, loadFromCache, saveUser, loadUser, clearUser } from '../services/localCache.js'

const SYSTEM_TODAY_LABEL_ID = 'system-today-label-0000-000000000000'
const SYSTEM_TODAY_LABEL = { id: SYSTEM_TODAY_LABEL_ID, name: 'Today', color: '#FCD34D', isSystem: true }

const DEFAULT_STATE = {
  nodes: {},
  labels: { [SYSTEM_TODAY_LABEL_ID]: SYSTEM_TODAY_LABEL },
  rootOrder: [],
  activeFilters: {},
  todaysTasksRootId: null,
  todaysTasksLabelId: SYSTEM_TODAY_LABEL_ID,
  theme: 'dark',
  user: null,
  detailsModalNodeId: null,
  showDoneToday: false,
  showLabelManager: false,
  syncStatus: 'idle', // 'idle' | 'saving' | 'error'
  dragMode: false,
  nestTargetId: null,
  nestZoneActive: false,
}

export const useStore = create((set, get) => ({
  ...DEFAULT_STATE,

  // ── Hydration ──────────────────────────────────────────────────────────────
  hydrate(data) {
    // Ensure Today system label always exists (backward compat with old saves)
    const labels = { [SYSTEM_TODAY_LABEL_ID]: SYSTEM_TODAY_LABEL, ...data.labels }
    set({ ...DEFAULT_STATE, ...data, labels, todaysTasksLabelId: SYSTEM_TODAY_LABEL_ID })
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

  addChildNode(parentId, afterId = null) {
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
    set(state => {
      const node = state.nodes[id]
      if (!node) return {}
      const updates = { [id]: { ...node, content } }
      node.linkedNodeIds.forEach(lid => {
        const linked = state.nodes[lid]
        if (linked) updates[lid] = { ...linked, content }
      })
      return { nodes: { ...state.nodes, ...updates } }
    })
  },

  toggleNodeType(id) {
    set(state => {
      const node = state.nodes[id]
      if (!node) return {}
      const type = node.type === 'CHECKBOX' ? 'BULLET' : 'CHECKBOX'
      const updates = { [id]: { ...node, type } }
      node.linkedNodeIds.forEach(lid => {
        const linked = state.nodes[lid]
        if (linked) updates[lid] = { ...linked, type }
      })
      return { nodes: { ...state.nodes, ...updates } }
    })
  },

  toggleComplete(id) {
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
        }
        // propagate to linked nodes
        n.linkedNodeIds.forEach(linkedId => {
          const linked = state.nodes[linkedId]
          if (linked) {
            updates[linkedId] = {
              ...linked,
              status: isCompleting ? 'COMPLETED' : 'OPEN',
              completedAt: isCompleting ? new Date().toISOString() : null,
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
      toDelete.forEach(nid => delete newNodes[nid])

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

      return { nodes: newNodes, rootOrder: newRootOrder, todaysTasksRootId: newTodaysTasksRootId }
    })
  },

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  moveNode({ nodeId, newParentId, newIndex }) {
    set(state => {
      const node = state.nodes[nodeId]
      if (!node) return {}
      const newNodes = { ...state.nodes }
      const newRootOrder = [...state.rootOrder]

      // Remove from old location
      if (node.parentId) {
        const oldParent = { ...newNodes[node.parentId] }
        oldParent.childrenIds = oldParent.childrenIds.filter(c => c !== nodeId)
        newNodes[node.parentId] = oldParent
      } else {
        const idx = newRootOrder.indexOf(nodeId)
        if (idx !== -1) newRootOrder.splice(idx, 1)
      }

      // Insert into new location
      if (newParentId === null) {
        newRootOrder.splice(newIndex, 0, nodeId)
        newNodes[nodeId] = { ...node, parentId: null }
      } else {
        const newParent = { ...newNodes[newParentId] }
        const children = [...newParent.childrenIds]
        children.splice(newIndex, 0, nodeId)
        newParent.childrenIds = children
        newNodes[newParentId] = newParent
        newNodes[nodeId] = { ...node, parentId: newParentId }
      }

      return { nodes: newNodes, rootOrder: newRootOrder }
    })
  },

  reorderRootCards(oldIndex, newIndex) {
    set(state => {
      const newRootOrder = [...state.rootOrder]
      const [moved] = newRootOrder.splice(oldIndex, 1)
      newRootOrder.splice(newIndex, 0, moved)
      return { rootOrder: newRootOrder }
    })
  },

  reorderChildren(parentId, oldIndex, newIndex) {
    set(state => {
      const parent = state.nodes[parentId]
      if (!parent) return {}
      const children = [...parent.childrenIds]
      const [moved] = children.splice(oldIndex, 1)
      children.splice(newIndex, 0, moved)
      return {
        nodes: { ...state.nodes, [parentId]: { ...parent, childrenIds: children } },
      }
    })
  },

  // Link a node as a Today's Task (copies node reference, shares state)
  linkToTodaysTasks(nodeId) {
    set(state => {
      const todaysId = state.todaysTasksRootId
      if (!todaysId) return {}
      const todaysCard = state.nodes[todaysId]
      const node = state.nodes[nodeId]
      if (!todaysCard || !node) return {}

      // Guard: already linked to today's tasks
      if (node.linkedNodeIds.some(lid => state.nodes[lid]?.isTodaysTask)) return {}

      const nodeUpdates = {}
      const newNodes = {}

      // Recursively create _today linked copies for originalId and all descendants
      function createLinkedTree(originalId, todayParentId) {
        const original = nodeUpdates[originalId] || state.nodes[originalId]
        if (!original) return
        const linkedId = originalId + '_today'

        nodeUpdates[originalId] = {
          ...original,
          linkedNodeIds: [...new Set([...original.linkedNodeIds, linkedId])],
        }

        const linkedChildIds = original.childrenIds.map(childId => {
          createLinkedTree(childId, linkedId)
          return childId + '_today'
        })

        newNodes[linkedId] = {
          ...state.nodes[originalId],
          id: linkedId,
          parentId: todayParentId,
          childrenIds: linkedChildIds,
          isTodaysTask: true,
          linkedNodeIds: [originalId],
        }
      }

      createLinkedTree(nodeId, todaysId)

      // Apply today label to root original only
      const todayLabelId = state.todaysTasksLabelId
      if (todayLabelId) {
        nodeUpdates[nodeId] = {
          ...nodeUpdates[nodeId],
          labelIds: [...new Set([...nodeUpdates[nodeId].labelIds, todayLabelId])],
        }
      }

      const updatedTodaysCard = {
        ...todaysCard,
        childrenIds: [...todaysCard.childrenIds, nodeId + '_today'],
      }

      return {
        nodes: {
          ...state.nodes,
          ...nodeUpdates,
          ...newNodes,
          [todaysId]: updatedTodaysCard,
        },
      }
    })
  },

  // Remove a linked today's copy and clean up the original (recursively for all descendants)
  unlinkFromTodaysTasks(linkedNodeId) {
    set(state => {
      const linkedNode = state.nodes[linkedNodeId]
      if (!linkedNode || !linkedNode.isTodaysTask) return {}

      const newNodes = { ...state.nodes }

      // Remove root linked copy from Today's Tasks card's childrenIds
      const todaysId = linkedNode.parentId
      if (todaysId && newNodes[todaysId]) {
        newNodes[todaysId] = {
          ...newNodes[todaysId],
          childrenIds: newNodes[todaysId].childrenIds.filter(c => c !== linkedNodeId),
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

      // Clean up linkedNodeIds on all originals; remove today label from root original only
      toDelete.forEach(tid => {
        const todayCopy = newNodes[tid]
        if (!todayCopy) return
        todayCopy.linkedNodeIds.forEach(originalId => {
          const original = newNodes[originalId]
          if (!original) return
          const filteredLinks = original.linkedNodeIds.filter(lid => lid !== tid)
          let { labelIds } = original
          if (tid === linkedNodeId && state.todaysTasksLabelId) {
            labelIds = labelIds.filter(lid => lid !== state.todaysTasksLabelId)
          }
          newNodes[originalId] = { ...original, linkedNodeIds: filteredLinks, labelIds }
        })
      })

      // Delete all collected _today nodes
      toDelete.forEach(tid => delete newNodes[tid])

      return { nodes: newNodes }
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
    // Normal label toggle
    set(state => {
      const node = state.nodes[nodeId]
      if (!node) return {}
      const has = node.labelIds.includes(labelId)
      const labelIds = has
        ? node.labelIds.filter(l => l !== labelId)
        : [...node.labelIds, labelId]
      return { nodes: { ...state.nodes, [nodeId]: { ...node, labelIds } } }
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
