import { useMemo } from 'react'
import { useStore } from '../store/useStore.js'

export const UNLABELED_FILTER_ID = '__unlabeled__'

function hasActiveFilters(activeFilters) {
  return Object.values(activeFilters).some(v => v !== null)
}

function nodeMatchesShowFilter(node, showLabels) {
  return showLabels.some(lid =>
    lid === UNLABELED_FILTER_ID ? node.labelIds.length === 0 : node.labelIds.includes(lid)
  )
}

function nodeMatchesHideFilter(node, hideLabels) {
  return hideLabels.some(lid =>
    lid === UNLABELED_FILTER_ID ? node.labelIds.length === 0 : node.labelIds.includes(lid)
  )
}

function subtreeMatchesShow(nodeId, nodes, showLabels) {
  const node = nodes[nodeId]
  if (!node) return false
  if (nodeMatchesShowFilter(node, showLabels)) return true
  return node.childrenIds.some(cid => subtreeMatchesShow(cid, nodes, showLabels))
}

function subtreeMatchesHide(nodeId, nodes, hideLabels) {
  const node = nodes[nodeId]
  if (!node) return false
  if (nodeMatchesHideFilter(node, hideLabels)) return true
  return node.childrenIds.some(cid => subtreeMatchesHide(cid, nodes, hideLabels))
}

// Returns a map: nodeId -> { visible: bool, dimmed: bool, hasHiddenChildren: bool, hasHiddenParent: bool }
export function useNodeVisibility() {
  const nodes = useStore(s => s.nodes)
  const activeFilters = useStore(s => s.activeFilters)

  return useMemo(() => {
    const showLabels = Object.entries(activeFilters).filter(([, v]) => v === 'show').map(([k]) => k)
    const hideLabels = Object.entries(activeFilters).filter(([, v]) => v === 'hide').map(([k]) => k)
    const hasFilters = showLabels.length > 0 || hideLabels.length > 0

    // Precompute nodes hidden by per-card hideCompleted setting
    const hiddenByHideCompleted = new Set()
    Object.values(nodes).forEach(card => {
      if (card.parentId === null && card.uiState?.hideCompleted) {
        const markHidden = (nodeId, ancestorCompleted) => {
          const n = nodes[nodeId]
          if (!n) return
          const isCompleted = ancestorCompleted || n.status === 'COMPLETED'
          if (isCompleted) {
            hiddenByHideCompleted.add(nodeId)
            n.childrenIds.forEach(cid => markHidden(cid, true))
          } else {
            n.childrenIds.forEach(cid => markHidden(cid, false))
          }
        }
        card.childrenIds.forEach(cid => markHidden(cid, false))
      }
    })

    if (!hasFilters) {
      // All visible, not dimmed (except hideCompleted)
      const result = {}
      Object.keys(nodes).forEach(id => {
        result[id] = { visible: !hiddenByHideCompleted.has(id), dimmed: false, hasHiddenChildren: false }
      })
      return result
    }

    const result = {}

    Object.keys(nodes).forEach(id => {
      const node = nodes[id]

      // Check show filters
      let visible = true
      let dimmed = false
      let hasHiddenChildren = false

      if (showLabels.length > 0) {
        const selfMatches = nodeMatchesShowFilter(node, showLabels)
        const subtreeMatches = subtreeMatchesShow(id, nodes, showLabels)
        if (!selfMatches && !subtreeMatches) {
          // Check if any ancestor matches — if so, keep visible but dimmed
          visible = false
          dimmed = false
        } else if (subtreeMatches && !selfMatches) {
          visible = true
          dimmed = true
        } else {
          visible = true
          dimmed = false
        }
      }

      if (hideLabels.length > 0 && visible) {
        const selfHidden = nodeMatchesHideFilter(node, hideLabels)
        if (selfHidden) {
          visible = false
        } else {
          // Check if children are hidden
          hasHiddenChildren = node.childrenIds.some(cid =>
            subtreeMatchesHide(cid, nodes, hideLabels)
          )
        }
      }

      if (hiddenByHideCompleted.has(id)) visible = false
      result[id] = { visible, dimmed, hasHiddenChildren }
    })

    // Second pass: if a node is visible and has visible descendants, ensure ancestor is visible
    if (showLabels.length > 0) {
      Object.keys(nodes).forEach(id => {
        if (!result[id].visible) {
          // Check if any child is visible — if so, show this node dimmed
          const node = nodes[id]
          const anyChildVisible = node.childrenIds.some(cid => result[cid]?.visible)
          if (anyChildVisible) {
            result[id] = { ...result[id], visible: true, dimmed: true }
          }
        }
      })
    }

    return result
  }, [nodes, activeFilters])
}

// Get all descendant label colors for a collapsed node
export function useDescendantLabelColors(nodeId) {
  const nodes = useStore(s => s.nodes)
  const labels = useStore(s => s.labels)

  return useMemo(() => {
    const colorSet = new Set()
    const visit = (id) => {
      const node = nodes[id]
      if (!node) return
      node.labelIds.forEach(lid => {
        const label = labels[lid]
        if (label) colorSet.add(label.color)
      })
      node.childrenIds.forEach(visit)
    }
    const node = nodes[nodeId]
    if (node) node.childrenIds.forEach(visit)
    return Array.from(colorSet).slice(0, 8) // limit dots
  }, [nodeId, nodes, labels])
}
