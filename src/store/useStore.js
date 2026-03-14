import { create } from 'zustand'
import { createNode, createLabel, createHistorySnapshot } from '../types/index.js'
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
  // Daily cleanup & history
  history: [],           // DaySnapshot[]  (persisted)
  lastCleanupDate: null, // 'YYYY-MM-DD'   (persisted)
  pendingCleanupTasks: null, // [{id, content, originalId, resolved}] | null (ephemeral)
  showHistory: false,    // bool (ephemeral)
  showDemoModal: false,  // bool (ephemeral)
  // Demo mode
  isDemoMode: false,
  savedRealData: null,   // { nodes, rootOrder, history, lastCleanupDate, todaysTasksRootId } | null
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

  // ── Daily Cleanup & History ─────────────────────────────────────────────────
  setShowHistory(val) {
    set({ showHistory: val })
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
      if (!todaysTasksRootId) return {}
      const todaysCard = nodes[todaysTasksRootId]
      if (!todaysCard || todaysCard.childrenIds.length === 0) {
        return { lastCleanupDate: new Date().toISOString().split('T')[0] }
      }

      const yesterdayDate = lastCleanupDate // the date we're archiving

      const completed = todaysCard.childrenIds.filter(id => nodes[id]?.status === 'COMPLETED')
      const incomplete = todaysCard.childrenIds.filter(id => nodes[id] && nodes[id].status !== 'COMPLETED')

      let newNodes = { ...nodes }
      let newHistory = [...history]
      let newRootOrder = [...state.rootOrder]

      // Archive completed tasks into a snapshot
      if (completed.length > 0) {
        const snapshotTasks = completed.map(id => get()._serializeTaskTree(id, nodes)).filter(Boolean)

        // Merge with existing snapshot for this date or create new
        const existingIdx = newHistory.findIndex(s => s.date === yesterdayDate)
        if (existingIdx >= 0) {
          newHistory[existingIdx] = {
            ...newHistory[existingIdx],
            tasks: [...newHistory[existingIdx].tasks, ...snapshotTasks],
          }
        } else {
          newHistory.push(createHistorySnapshot(yesterdayDate, snapshotTasks))
        }

        // Unlink completed _today copies
        completed.forEach(todayId => {
          const todayNode = newNodes[todayId]
          if (!todayNode) return

          // Collect all _today descendants
          const toDelete = new Set()
          const collect = (nid) => {
            const n = newNodes[nid]
            if (!n) return
            toDelete.add(nid)
            n.childrenIds.forEach(collect)
          }
          collect(todayId)

          // Remove from Today's card children
          const todaysCardNode = newNodes[todaysTasksRootId]
          if (todaysCardNode) {
            newNodes[todaysTasksRootId] = {
              ...todaysCardNode,
              childrenIds: todaysCardNode.childrenIds.filter(c => c !== todayId),
            }
          }

          // Clean up originals' linkedNodeIds and Today label
          toDelete.forEach(tid => {
            const todayCopy = newNodes[tid]
            if (!todayCopy) return
            todayCopy.linkedNodeIds.forEach(originalId => {
              const original = newNodes[originalId]
              if (!original) return
              const filteredLinks = original.linkedNodeIds.filter(lid => !toDelete.has(lid))
              let { labelIds } = original
              if (tid === todayId && state.todaysTasksLabelId) {
                labelIds = labelIds.filter(lid => lid !== state.todaysTasksLabelId)
              }
              newNodes[originalId] = { ...original, linkedNodeIds: filteredLinks, labelIds }
            })
            delete newNodes[tid]
          })
        })
      }

      // Set up pending incomplete tasks (modal will handle these)
      let pendingCleanupTasks = null
      let newLastCleanupDate = state.lastCleanupDate
      if (incomplete.length > 0) {
        pendingCleanupTasks = incomplete.map(id => ({
          id,
          content: nodes[id]?.content ?? '',
          originalId: nodes[id]?.linkedNodeIds[0] ?? null,
          resolved: null, // 'today' | 'complete' | 'pushback'
        }))
      } else {
        newLastCleanupDate = new Date().toISOString().split('T')[0]
      }

      return {
        nodes: newNodes,
        rootOrder: newRootOrder,
        history: newHistory,
        lastCleanupDate: newLastCleanupDate,
        pendingCleanupTasks,
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
      const yesterdayDate = lastCleanupDate

      const toArchive = []

      pendingCleanupTasks.forEach(task => {
        const { id: todayId, resolved } = task
        const todayNode = newNodes[todayId]
        if (!todayNode) return

        if (resolved === 'complete') {
          // Mark completed and collect for archive
          const originalId = todayNode.linkedNodeIds[0]
          const original = newNodes[originalId]
          const now = new Date().toISOString()
          if (original) {
            newNodes[originalId] = { ...original, status: 'COMPLETED', completedAt: now }
          }
          newNodes[todayId] = { ...todayNode, status: 'COMPLETED', completedAt: now }
          toArchive.push(todayId)

          // Unlink from Today's card
          const todaysCardNode = newNodes[todaysTasksRootId]
          if (todaysCardNode) {
            newNodes[todaysTasksRootId] = {
              ...todaysCardNode,
              childrenIds: todaysCardNode.childrenIds.filter(c => c !== todayId),
            }
          }

          // Clean up _today descendants
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
              if (tid === todayId && state.todaysTasksLabelId) {
                labelIds = labelIds.filter(lid => lid !== state.todaysTasksLabelId)
              }
              newNodes[oid] = { ...orig, linkedNodeIds: filteredLinks, labelIds }
            })
            delete newNodes[tid]
          })
        } else if (resolved === 'pushback') {
          // Remove _today copy, preserve original
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
              if (tid === todayId && state.todaysTasksLabelId) {
                labelIds = labelIds.filter(lid => lid !== state.todaysTasksLabelId)
              }
              newNodes[oid] = { ...orig, linkedNodeIds: filteredLinks, labelIds }
            })
            delete newNodes[tid]
          })
        }
        // 'today': leave as-is, stays in Today's Tasks
      })

      // Archive 'complete'-resolved tasks
      if (toArchive.length > 0) {
        const snapshotTasks = toArchive.map(id => {
          const n = newNodes[id] ?? nodes[id]
          if (!n) return null
          const origId = n.linkedNodeIds[0] ?? id
          const orig = newNodes[origId] ?? nodes[origId] ?? n
          return {
            id: origId,
            content: orig.content,
            status: 'COMPLETED',
            type: orig.type,
            completedAt: orig.completedAt,
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
      }
    })
  },

  clearDemoData() {
    const DEMO_CARD_ID = 'demo-card-seed-0000-0000-000000000001'
    set(state => {
      const newNodes = { ...state.nodes }
      // Collect demo card and all its descendants + _today copies
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
    const { nodes, rootOrder, history, lastCleanupDate, todaysTasksRootId } = get()
    set({
      savedRealData: { nodes, rootOrder, history, lastCleanupDate, todaysTasksRootId },
      nodes: {},
      rootOrder: [],
      history: [],
      lastCleanupDate: null,
      todaysTasksRootId: null,
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
