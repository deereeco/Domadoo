import { create } from 'zustand'
import { createNode, createLabel } from '../types/index.js'
import { saveToCache, loadFromCache, saveUser, loadUser, clearUser } from '../services/localCache.js'

const DEFAULT_STATE = {
  nodes: {},
  labels: {},
  rootOrder: [],
  activeFilters: {},
  todaysTasksRootId: null,
  todaysTasksLabelId: null,
  theme: 'dark',
  user: null,
  detailsModalNodeId: null,
  showDoneToday: false,
  showLabelManager: false,
  syncStatus: 'idle', // 'idle' | 'saving' | 'error'
  dragMode: false,
}

export const useStore = create((set, get) => ({
  ...DEFAULT_STATE,

  // ── Hydration ──────────────────────────────────────────────────────────────
  hydrate(data) {
    set({ ...DEFAULT_STATE, ...data })
  },

  // ── Drag Mode ──────────────────────────────────────────────────────────────
  toggleDragMode() {
    set(s => ({ dragMode: !s.dragMode }))
  },

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
    const todayLabel = createLabel({ name: 'Today', color: '#FCD34D', isSystem: true })
    set(state => ({
      nodes: { ...state.nodes, [node.id]: node },
      labels: { ...state.labels, [todayLabel.id]: todayLabel },
      rootOrder: [node.id, ...state.rootOrder],
      todaysTasksRootId: node.id,
      todaysTasksLabelId: todayLabel.id,
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
      return {
        nodes: {
          ...state.nodes,
          [node.id]: node,
          [parentId]: { ...parent, childrenIds },
        },
      }
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
        if (n) n.childrenIds.forEach(collectDescendants)
      }
      collectDescendants(id)

      // Optionally also delete linked nodes (e.g. today's copies)
      if (deleteLinked) {
        node.linkedNodeIds.forEach(lid => collectDescendants(lid))
      }

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

      // Remove any linked-deleted nodes from their parents too
      if (deleteLinked) {
        node.linkedNodeIds.forEach(lid => {
          const linked = state.nodes[lid]
          if (!linked || toDelete.has(linked.parentId)) return
          const parent = newNodes[linked.parentId]
          if (parent) {
            newNodes[linked.parentId] = {
              ...parent,
              childrenIds: parent.childrenIds.filter(c => c !== lid),
            }
          }
        })
      }

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

      // Create a linked copy
      const linkedNode = {
        ...node,
        id: node.id + '_today',
        parentId: todaysId,
        childrenIds: [],
        isTodaysTask: true,
        linkedNodeIds: [nodeId],
      }

      // Apply today label to original
      const todayLabelId = state.todaysTasksLabelId
      const updatedLabelIds = todayLabelId
        ? [...new Set([...node.labelIds, todayLabelId])]
        : node.labelIds

      // Update original node's linkedNodeIds and today label
      const updatedOriginal = {
        ...node,
        linkedNodeIds: [...new Set([...node.linkedNodeIds, linkedNode.id])],
        labelIds: updatedLabelIds,
      }
      const updatedTodaysCard = {
        ...todaysCard,
        childrenIds: [...todaysCard.childrenIds, linkedNode.id],
      }

      return {
        nodes: {
          ...state.nodes,
          [nodeId]: updatedOriginal,
          [linkedNode.id]: linkedNode,
          [todaysId]: updatedTodaysCard,
        },
      }
    })
  },

  // Remove a linked today's copy and clean up the original
  unlinkFromTodaysTasks(linkedNodeId) {
    set(state => {
      const linkedNode = state.nodes[linkedNodeId]
      if (!linkedNode || !linkedNode.isTodaysTask) return {}

      const newNodes = { ...state.nodes }

      // Remove from Today's Tasks card's childrenIds
      const todaysId = linkedNode.parentId
      if (todaysId && newNodes[todaysId]) {
        newNodes[todaysId] = {
          ...newNodes[todaysId],
          childrenIds: newNodes[todaysId].childrenIds.filter(c => c !== linkedNodeId),
        }
      }

      // Clean up original node's linkedNodeIds and today label
      linkedNode.linkedNodeIds.forEach(originalId => {
        const original = newNodes[originalId]
        if (!original) return
        const filteredLinks = original.linkedNodeIds.filter(lid => lid !== linkedNodeId)
        const filteredLabels = state.todaysTasksLabelId
          ? original.labelIds.filter(lid => lid !== state.todaysTasksLabelId)
          : original.labelIds
        newNodes[originalId] = { ...original, linkedNodeIds: filteredLinks, labelIds: filteredLabels }
      })

      // Delete the linked copy
      delete newNodes[linkedNodeId]

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
