/**
 * Merges two app states (local and Drive) into a combined state.
 * Uses per-node updatedAt timestamps and deletion tombstones so both
 * devices' changes survive rather than one overwriting the other.
 */
export function mergeStates(local, drive) {
  const allDeletedNodes = {
    ...(local.deletedNodes || {}),
    ...(drive.deletedNodes || {}),
  }
  // Keep the more recent deletedAt for each tombstoned ID
  for (const id of Object.keys(local.deletedNodes || {})) {
    const d = drive.deletedNodes?.[id]
    if (d && d.deletedAt > allDeletedNodes[id].deletedAt) {
      allDeletedNodes[id] = d
    }
  }

  // 1. Nodes: union both sets, per-node newest updatedAt wins, tombstones respected
  const mergedNodes = { ...local.nodes }

  for (const [id, driveNode] of Object.entries(drive.nodes || {})) {
    const tombstone = allDeletedNodes[id]
    if (tombstone && tombstone.deletedAt > (driveNode.updatedAt || 0)) {
      delete mergedNodes[id]
      continue
    }
    const localNode = local.nodes?.[id]
    if (!localNode) {
      mergedNodes[id] = driveNode
    } else if ((driveNode.updatedAt || 0) > (localNode.updatedAt || 0)) {
      mergedNodes[id] = driveNode
    }
  }

  for (const id of Object.keys(local.nodes || {})) {
    const tombstone = allDeletedNodes[id]
    if (tombstone && tombstone.deletedAt > (mergedNodes[id]?.updatedAt || 0)) {
      delete mergedNodes[id]
    }
  }

  // 2. rootOrder: prefer the newer savedAt side's order, append any new IDs from the other
  const [newerOrder, olderOrder] = (drive.savedAt || 0) > (local.savedAt || 0)
    ? [drive.rootOrder, local.rootOrder]
    : [local.rootOrder, drive.rootOrder]
  const mergedRootOrder = [...(newerOrder || [])]
  for (const id of (olderOrder || [])) {
    if (!mergedRootOrder.includes(id)) mergedRootOrder.push(id)
  }
  const filteredRootOrder = mergedRootOrder.filter(id => mergedNodes[id])

  // 3. childrenIds per node: same union approach
  for (const id of Object.keys(mergedNodes)) {
    const l = local.nodes?.[id]
    const d = drive.nodes?.[id]
    if (!l || !d) continue // only on one side — keep as-is
    const [newerChildren, olderChildren] = (d.updatedAt || 0) > (l.updatedAt || 0)
      ? [d.childrenIds, l.childrenIds]
      : [l.childrenIds, d.childrenIds]
    const merged = [...(newerChildren || [])]
    for (const cid of (olderChildren || [])) {
      if (!merged.includes(cid)) merged.push(cid)
    }
    mergedNodes[id] = {
      ...mergedNodes[id],
      childrenIds: merged.filter(cid => mergedNodes[cid]),
    }
  }

  // 4. history: union by date (append-only snapshots)
  const historyByDate = {}
  for (const h of [...(local.history || []), ...(drive.history || [])]) {
    historyByDate[h.date] = h
  }
  const mergedHistory = Object.values(historyByDate).sort((a, b) => a.date.localeCompare(b.date))

  // 5. labels: union by ID (local wins on conflict — most label edits happen on current device)
  const mergedLabels = { ...(drive.labels || {}), ...(local.labels || {}) }

  // 6. Scalar fields: use the newer savedAt side as the base
  const base = (drive.savedAt || 0) > (local.savedAt || 0) ? drive : local

  return {
    ...base,
    nodes: mergedNodes,
    rootOrder: filteredRootOrder,
    history: mergedHistory,
    labels: mergedLabels,
    deletedNodes: allDeletedNodes,
  }
}
