import { create } from 'zustand'
import { createNode, createLabel } from '../types/index.js'
import { saveToCache, loadFromCache, saveUser, loadUser, clearUser } from '../services/localCache.js'

const DEFAULT_STATE = {
  nodes: {},
  labels: {},
  rootOrder: [],
  activeFilters: {},
  todaysTasksRootId: null,
  theme: 'dark',
  user: null,
  detailsModalNodeId: null,
  showDoneToday: false,
  showLabelManager: false,
  syncStatus: 'idle', // 'idle' | 'saving' | 'error'
}

export const useStore = create((set, get) => ({
  ...DEFAULT_STATE,

  // ── Hydration ──────────────────────────────────────────────────────────────
  hydrate(data) {
    set({ ...DEFAULT_STATE, ...data })
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
    set(state => ({
      nodes: { ...state.nodes, [node.id]: node },
      rootOrder: [node.id, ...state.rootOrder],
      todaysTasksRootId: node.id,
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
      return { nodes: { ...state.nodes, [id]: { ...node, content } } }
    })
  },

  toggleNodeType(id) {
    set(state => {
      const node = state.nodes[id]
      if (!node) return {}
      const type = node.type === 'CHECKBOX' ? 'BULLET' : 'CHECKBOX'
      return { nodes: { ...state.nodes, [id]: { ...node, type } } }
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

  deleteNode(id) {
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

      const newNodes = { ...state.nodes }
      toDelete.forEach(nid => delete newNodes[nid])

      // Remove from parent
      if (node.parentId) {
        const parent = newNodes[node.parentId]
        if (parent) {
          newNodes[node.parentId] = {
            ...parent,
            childrenIds: parent.childrenIds.filter(c => c !== id),
          }
        }
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

      // Create a linked copy
      const linkedNode = {
        ...node,
        id: node.id + '_today',
        parentId: todaysId,
        childrenIds: [],
        isTodaysTask: true,
        linkedNodeIds: [nodeId],
      }
      // Update original node's linkedNodeIds
      const updatedOriginal = {
        ...node,
        linkedNodeIds: [...new Set([...node.linkedNodeIds, linkedNode.id])],
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
  useStore.setState({ user: persistedUser })
}
const currentTheme = useStore.getState().theme
document.documentElement.classList.toggle('dark', currentTheme === 'dark')
