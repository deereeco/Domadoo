import { v4 as uuidv4 } from 'uuid'

export function createNode({ parentId = null, type = 'CHECKBOX', content = '' } = {}) {
  return {
    id: uuidv4(),
    parentId,
    childrenIds: [],
    type,
    status: 'OPEN',
    content,
    uiState: { isExpanded: true, isFocusMode: false, breadcrumbHidden: false, breadcrumbErased: false },
    labelIds: [],
    linkedNodeIds: [],
    isTodaysTask: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
    updatedAt: Date.now(),
  }
}

export function createHistorySnapshot(date, tasks) {
  return { id: uuidv4(), date, tasks }
}

export function createLabel({ name = 'New Label', color = '#6366f1', isSystem = false } = {}) {
  return {
    id: uuidv4(),
    name,
    color,
    isSystem,
  }
}
