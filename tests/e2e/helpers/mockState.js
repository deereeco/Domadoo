// Fixed IDs for deterministic tests
export const IDS = {
  CARD_A: 'test-card-aaaa-0000-0000-000000000001',
  CARD_B: 'test-card-bbbb-0000-0000-000000000002',
  TASK_A1: 'test-node-a100-0000-0000-000000000003',
  TASK_A2: 'test-node-a200-0000-0000-000000000004',
  TASK_B1: 'test-node-b100-0000-0000-000000000005',
  TASK_B2: 'test-node-b200-0000-0000-000000000006',
  TODAY_LABEL: 'system-today-label-0000-000000000000',
  // Cleanup test IDs
  TODAY_CARD: 'test-today-card-0000-000000000007',
  ORIG_COMPLETED: 'test-orig-comp-0000-000000000008',
  ORIG_INCOMPLETE: 'test-orig-inc--0000-000000000009',
  TODAY_COMPLETED: 'test-orig-comp-0000-000000000008_today',
  TODAY_INCOMPLETE: 'test-orig-inc--0000-000000000009_today',
  // Subtask cleanup test IDs (issue #22)
  SUBTASK_CARD:       'test-sub-card--0000-0000-000000000014',
  PARENT_ORIG:        'test-node-par0-0000-0000-000000000015',
  SUBTASK_DONE:       'test-node-sub1-0000-0000-000000000016',
  SUBTASK_OPEN:       'test-node-sub2-0000-0000-000000000017',
  TODAY_CARD_ST:      'test-today-st00-0000-0000-000000000018',
  PARENT_TODAY:       'test-node-par0-0000-0000-000000000015_today',
  SUBTASK_DONE_TODAY: 'test-node-sub1-0000-0000-000000000016_today',
  SUBTASK_OPEN_TODAY: 'test-node-sub2-0000-0000-000000000017_today',
  // Breadcrumb test IDs
  CARD_LAB:       'test-card-lab0-0000-0000-000000000010',
  TASK_CLEANING:  'test-node-cln0-0000-0000-000000000011',
  TASK_TABLE:     'test-node-tbl0-0000-0000-000000000012',
  TODAY_CARD_BC:  'test-today-bc00-0000-0000-000000000013',
  TODAY_TABLE:    'test-node-tbl0-0000-0000-000000000012_today',
  TODAY_CLEANING: 'test-node-cln0-0000-0000-000000000011_today',
}

function node(id, parentId, childrenIds, content) {
  return {
    id,
    parentId,
    childrenIds,
    type: 'CHECKBOX',
    status: 'OPEN',
    content,
    uiState: { isExpanded: true, isFocusMode: false },
    labelIds: [],
    linkedNodeIds: [],
    isTodaysTask: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    completedAt: null,
  }
}

export const MOCK_USER = {
  name: 'Playwright Test',
  email: 'test@playwright.local',
  picture: '',
}

export const MOCK_STATE = {
  nodes: {
    [IDS.CARD_A]: node(IDS.CARD_A, null, [IDS.TASK_A1, IDS.TASK_A2], 'Card A'),
    [IDS.CARD_B]: node(IDS.CARD_B, null, [IDS.TASK_B1, IDS.TASK_B2], 'Card B'),
    [IDS.TASK_A1]: node(IDS.TASK_A1, IDS.CARD_A, [], 'Task A1'),
    [IDS.TASK_A2]: node(IDS.TASK_A2, IDS.CARD_A, [], 'Task A2'),
    [IDS.TASK_B1]: node(IDS.TASK_B1, IDS.CARD_B, [], 'Task B1'),
    [IDS.TASK_B2]: node(IDS.TASK_B2, IDS.CARD_B, [], 'Task B2'),
  },
  labels: {
    [IDS.TODAY_LABEL]: { id: IDS.TODAY_LABEL, name: 'Today', color: '#FCD34D', isSystem: true },
  },
  rootOrder: [IDS.CARD_A, IDS.CARD_B],
  activeFilters: {},
  todaysTasksRootId: null,
  todaysTasksLabelId: IDS.TODAY_LABEL,
  theme: 'light',
  dragMode: false, // tests enable drag mode explicitly via the Drag toggle button
  nestTargetId: null,
  nestZoneActive: false,
}

// Returns 'YYYY-MM-DD' for today or an offset (negative = past)
export function isoDate(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

// A state with Today's Tasks card containing one completed and one incomplete linked task
export function buildCleanupState({ lastCleanupDate = isoDate(-1) } = {}) {
  const completedAt = new Date(lastCleanupDate + 'T10:00:00').toISOString()
  return {
    nodes: {
      // Original source card
      [IDS.CARD_A]: node(IDS.CARD_A, null, [IDS.ORIG_COMPLETED, IDS.ORIG_INCOMPLETE], 'Card A'),
      // Original tasks (linked to Today)
      [IDS.ORIG_COMPLETED]: {
        ...node(IDS.ORIG_COMPLETED, IDS.CARD_A, [], 'Completed Task'),
        status: 'COMPLETED',
        completedAt,
        labelIds: [IDS.TODAY_LABEL],
        linkedNodeIds: [IDS.TODAY_COMPLETED],
      },
      [IDS.ORIG_INCOMPLETE]: {
        ...node(IDS.ORIG_INCOMPLETE, IDS.CARD_A, [], 'Incomplete Task'),
        labelIds: [IDS.TODAY_LABEL],
        linkedNodeIds: [IDS.TODAY_INCOMPLETE],
      },
      // Today's Tasks card
      [IDS.TODAY_CARD]: {
        ...node(IDS.TODAY_CARD, null, [IDS.TODAY_COMPLETED, IDS.TODAY_INCOMPLETE], "Today's Tasks"),
        isTodaysTask: true,
      },
      // _today copies
      [IDS.TODAY_COMPLETED]: {
        ...node(IDS.TODAY_COMPLETED, IDS.TODAY_CARD, [], 'Completed Task'),
        status: 'COMPLETED',
        completedAt,
        isTodaysTask: true,
        linkedNodeIds: [IDS.ORIG_COMPLETED],
      },
      [IDS.TODAY_INCOMPLETE]: {
        ...node(IDS.TODAY_INCOMPLETE, IDS.TODAY_CARD, [], 'Incomplete Task'),
        isTodaysTask: true,
        linkedNodeIds: [IDS.ORIG_INCOMPLETE],
      },
    },
    labels: {
      [IDS.TODAY_LABEL]: { id: IDS.TODAY_LABEL, name: 'Today', color: '#FCD34D', isSystem: true },
    },
    rootOrder: [IDS.TODAY_CARD, IDS.CARD_A],
    activeFilters: {},
    todaysTasksRootId: IDS.TODAY_CARD,
    todaysTasksLabelId: IDS.TODAY_LABEL,
    theme: 'light',
    dragMode: false,
    nestTargetId: null,
    nestZoneActive: false,
    history: [],
    lastCleanupDate,
  }
}

function injectState(page, state) {
  return page.addInitScript(({ user, state }) => {
    localStorage.setItem('domadoo_user', JSON.stringify(user))
    localStorage.setItem('domadoo_state', JSON.stringify(state))
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: () => ({ requestAccessToken: () => {} }),
          revoke: () => {},
        },
        id: {
          initialize: () => {},
          renderButton: () => {},
        },
      },
    }
  }, { user: MOCK_USER, state })
}

/**
 * Injects mock user + board state into localStorage before page JS runs.
 * Also stubs window.google so initGoogleAuth completes without real OAuth calls.
 *
 * NOTE: Data is only persisted locally (localStorage) — no Google Drive sync in tests.
 */
export async function setupMockState(page) {
  // Block Google CDN scripts before they overwrite our window.google stub
  await page.route('https://apis.google.com/**', route => route.abort())
  await page.route('https://accounts.google.com/**', route => route.abort())
  await injectState(page, MOCK_STATE)
}

/**
 * Sets up state with a Today's Tasks card having completed + incomplete tasks,
 * with lastCleanupDate set to yesterday so cleanup triggers on load.
 */
export async function setupCleanupState(page, opts = {}) {
  await page.route('https://apis.google.com/**', route => route.abort())
  await page.route('https://accounts.google.com/**', route => route.abort())
  const state = buildCleanupState({ lastCleanupDate: isoDate(-1), ...opts })
  await injectState(page, state)
}

/**
 * State for breadcrumb tests:
 *   Card "Lab"
 *     └─ Task "Cleaning"
 *          └─ Subtask "table"
 *
 *   Today's Tasks root
 *     └─ "table" (today-copy, direct child of Today root) ← breadcrumb should show "Lab → Cleaning"
 *
 * The `nested` option adds "Cleaning" as a today-copy parent of "table", so breadcrumb should disappear.
 */
export function buildBreadcrumbState({ nested = false } = {}) {
  const nodes = {
    [IDS.CARD_LAB]: {
      ...node(IDS.CARD_LAB, null, [IDS.TASK_CLEANING], 'Lab'),
    },
    [IDS.TASK_CLEANING]: {
      ...node(IDS.TASK_CLEANING, IDS.CARD_LAB, [IDS.TASK_TABLE], 'Cleaning'),
      linkedNodeIds: nested ? [IDS.TODAY_CLEANING] : [],
    },
    [IDS.TASK_TABLE]: {
      ...node(IDS.TASK_TABLE, IDS.TASK_CLEANING, [], 'table'),
      linkedNodeIds: [IDS.TODAY_TABLE],
    },
    [IDS.TODAY_CARD_BC]: {
      ...node(IDS.TODAY_CARD_BC, null,
        nested ? [IDS.TODAY_CLEANING] : [IDS.TODAY_TABLE],
        "Today's Tasks"),
      isTodaysTask: true,
    },
    [IDS.TODAY_TABLE]: {
      ...node(IDS.TODAY_TABLE,
        nested ? IDS.TODAY_CLEANING : IDS.TODAY_CARD_BC,
        [], 'table'),
      isTodaysTask: true,
      linkedNodeIds: [IDS.TASK_TABLE],
    },
  }

  if (nested) {
    nodes[IDS.TODAY_CLEANING] = {
      ...node(IDS.TODAY_CLEANING, IDS.TODAY_CARD_BC, [IDS.TODAY_TABLE], 'Cleaning'),
      isTodaysTask: true,
      linkedNodeIds: [IDS.TASK_CLEANING],
    }
  }

  return {
    nodes,
    labels: {
      [IDS.TODAY_LABEL]: { id: IDS.TODAY_LABEL, name: 'Today', color: '#FCD34D', isSystem: true },
    },
    rootOrder: [IDS.TODAY_CARD_BC, IDS.CARD_LAB],
    activeFilters: {},
    todaysTasksRootId: IDS.TODAY_CARD_BC,
    todaysTasksLabelId: IDS.TODAY_LABEL,
    theme: 'light',
    dragMode: false,
    nestTargetId: null,
    nestZoneActive: false,
    history: [],
    lastCleanupDate: null,
  }
}

export async function setupBreadcrumbState(page, opts = {}) {
  await page.route('https://apis.google.com/**', route => route.abort())
  await page.route('https://accounts.google.com/**', route => route.abort())
  await injectState(page, buildBreadcrumbState(opts))
}

/**
 * Sets up a fresh state (no Today's Tasks, no lastCleanupDate) — simulates first install.
 */
export async function setupFreshState(page) {
  await page.route('https://apis.google.com/**', route => route.abort())
  await page.route('https://accounts.google.com/**', route => route.abort())
  await injectState(page, MOCK_STATE)
}

/**
 * Sets up state already in demo mode (isDemoMode: true), with savedRealData pointing
 * to a simple two-card board. The visible state shows demo's Today's Tasks card.
 */
/**
 * State for subtask-aware archiving tests (issue #22):
 *   Card A
 *     └─ Cleaning (COMPLETED, root)
 *          ├─ table (COMPLETED subtask)
 *          └─ windows (OPEN subtask)
 *
 *   Today's Tasks
 *     └─ Cleaning (today-copy, COMPLETED root, but windows still OPEN)
 *
 * lastCleanupDate = yesterday → triggers cleanup on load.
 * Expected: task auto-stays in Today's Tasks (no modal, not archived).
 */
export function buildSubtaskCleanupState() {
  const parentCompletedAt = isoDate(-1) + 'T10:00:00Z'
  const subtaskCompletedAt = isoDate(-2) + 'T09:00:00Z'
  return {
    nodes: {
      [IDS.SUBTASK_CARD]: node(IDS.SUBTASK_CARD, null, [IDS.PARENT_ORIG], 'Card A'),
      [IDS.PARENT_ORIG]: {
        ...node(IDS.PARENT_ORIG, IDS.SUBTASK_CARD, [IDS.SUBTASK_DONE, IDS.SUBTASK_OPEN], 'Cleaning'),
        status: 'COMPLETED',
        completedAt: parentCompletedAt,
        labelIds: [IDS.TODAY_LABEL],
        linkedNodeIds: [IDS.PARENT_TODAY],
      },
      [IDS.SUBTASK_DONE]: {
        ...node(IDS.SUBTASK_DONE, IDS.PARENT_ORIG, [], 'table'),
        status: 'COMPLETED',
        completedAt: subtaskCompletedAt,
        linkedNodeIds: [IDS.SUBTASK_DONE_TODAY],
      },
      [IDS.SUBTASK_OPEN]: {
        ...node(IDS.SUBTASK_OPEN, IDS.PARENT_ORIG, [], 'windows'),
        linkedNodeIds: [IDS.SUBTASK_OPEN_TODAY],
      },
      [IDS.TODAY_CARD_ST]: {
        ...node(IDS.TODAY_CARD_ST, null, [IDS.PARENT_TODAY], "Today's Tasks"),
        isTodaysTask: true,
      },
      [IDS.PARENT_TODAY]: {
        ...node(IDS.PARENT_TODAY, IDS.TODAY_CARD_ST, [IDS.SUBTASK_DONE_TODAY, IDS.SUBTASK_OPEN_TODAY], 'Cleaning'),
        status: 'COMPLETED',
        completedAt: parentCompletedAt,
        isTodaysTask: true,
        linkedNodeIds: [IDS.PARENT_ORIG],
      },
      [IDS.SUBTASK_DONE_TODAY]: {
        ...node(IDS.SUBTASK_DONE_TODAY, IDS.PARENT_TODAY, [], 'table'),
        status: 'COMPLETED',
        completedAt: subtaskCompletedAt,
        isTodaysTask: true,
        linkedNodeIds: [IDS.SUBTASK_DONE],
      },
      [IDS.SUBTASK_OPEN_TODAY]: {
        ...node(IDS.SUBTASK_OPEN_TODAY, IDS.PARENT_TODAY, [], 'windows'),
        isTodaysTask: true,
        linkedNodeIds: [IDS.SUBTASK_OPEN],
      },
    },
    labels: {
      [IDS.TODAY_LABEL]: { id: IDS.TODAY_LABEL, name: 'Today', color: '#FCD34D', isSystem: true },
    },
    rootOrder: [IDS.TODAY_CARD_ST, IDS.SUBTASK_CARD],
    activeFilters: {},
    todaysTasksRootId: IDS.TODAY_CARD_ST,
    todaysTasksLabelId: IDS.TODAY_LABEL,
    theme: 'light',
    dragMode: false,
    nestTargetId: null,
    nestZoneActive: false,
    history: [],
    lastCleanupDate: isoDate(-1),
  }
}

export async function setupSubtaskCleanupState(page) {
  await page.route('https://apis.google.com/**', route => route.abort())
  await page.route('https://accounts.google.com/**', route => route.abort())
  await injectState(page, buildSubtaskCleanupState())
}

export async function setupDemoModeState(page) {
  await page.route('https://apis.google.com/**', route => route.abort())
  await page.route('https://accounts.google.com/**', route => route.abort())
  const DEMO_CARD_ID = 'demo-card-seed-0000-0000-000000000001'
  const demoState = {
    ...MOCK_STATE,
    isDemoMode: true,
    savedRealData: {
      nodes: MOCK_STATE.nodes,
      rootOrder: MOCK_STATE.rootOrder,
      history: [],
      lastCleanupDate: null,
      todaysTasksRootId: null,
    },
    // Minimal demo card so the board is not empty
    nodes: {
      [DEMO_CARD_ID]: {
        id: DEMO_CARD_ID, parentId: null, childrenIds: [],
        type: 'CHECKBOX', status: 'OPEN', content: 'Demo Card',
        uiState: { isExpanded: true, isFocusMode: false },
        labelIds: [], linkedNodeIds: [], isTodaysTask: false,
        createdAt: new Date().toISOString(), completedAt: null,
      },
    },
    rootOrder: [DEMO_CARD_ID],
  }
  await injectState(page, demoState)
}
