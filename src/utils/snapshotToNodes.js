// Converts a history snapshot (recursive task tree) into board-compatible { nodes, rootOrder }

export function snapshotToNodes(snapshot) {
  const nodes = {}
  const cardId = snapshot.id + '_card'

  function walk(task, parentId) {
    const childrenIds = (task.children || []).map(c => c.id)
    nodes[task.id] = {
      id: task.id,
      parentId,
      childrenIds,
      type: task.type || 'CHECKBOX',
      status: task.status || 'COMPLETED',
      content: task.content,
      uiState: { isExpanded: true, isFocusMode: false },
      labelIds: [],
      linkedNodeIds: [],
      isTodaysTask: false,
      createdAt: task.completedAt || new Date().toISOString(),
      completedAt: task.completedAt || null,
    }
    ;(task.children || []).forEach(child => walk(child, task.id))
  }

  nodes[cardId] = {
    id: cardId,
    parentId: null,
    childrenIds: (snapshot.tasks || []).map(t => t.id),
    type: 'CHECKBOX',
    status: 'OPEN',
    content: '',
    uiState: { isExpanded: true, isFocusMode: false },
    labelIds: [],
    linkedNodeIds: [],
    isTodaysTask: false,
    createdAt: snapshot.date,
    completedAt: null,
  }

  ;(snapshot.tasks || []).forEach(task => walk(task, cardId))

  return { nodes, rootOrder: [cardId] }
}

// "March 12's Completed Tasks"
export function formatSnapshotCardTitle(date) {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const monthDay = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(dt)
  return `${monthDay}'s Completed Tasks`
}

// "Yesterday, Mar 12" / "Mon Mar 11"
export function formatSnapshotDateLabel(date) {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const sameDate = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dt)

  if (sameDate(dt, yesterday)) return `Yesterday, ${monthDay}`

  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(dt)
}
