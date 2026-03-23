// Fixed IDs for deterministic tests
export const IDS = {
  CARD_A: 'test-card-aaaa-0000-0000-000000000001',
  CARD_B: 'test-card-bbbb-0000-0000-000000000002',
  TASK_A1: 'test-node-a100-0000-0000-000000000003',
  TASK_A2: 'test-node-a200-0000-0000-000000000004',
  TASK_B1: 'test-node-b100-0000-0000-000000000005',
  TASK_B2: 'test-node-b200-0000-0000-000000000006',
  TODAY_LABEL: 'system-today-label-0000-000000000000',
  TOMORROW_LABEL: 'system-tomorrow-label-0000-000000000000',
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
  // Tomorrow's Tasks test IDs
  TOMORROW_CARD:  'test-tmrw-card--0000-000000000019',
  ORIG_TOMORROW:  'test-orig-tmrw--0000-000000000020',
  TOMORROW_COPY:  'test-orig-tmrw--0000-000000000020_tomorrow',
  // Filter test IDs
  LABEL_WORK:           'test-label-work-0000-000000000021',
  LABEL_PERSONAL:       'test-label-pers-0000-000000000022',
  FILTER_CARD_A:        'test-filter-ca-0000-0000-000000000023',
  FILTER_CARD_B:        'test-filter-cb-0000-0000-000000000024',
  FILTER_TASK_WORK_1:   'test-filter-w1-0000-0000-000000000025',
  FILTER_TASK_WORK_2:   'test-filter-w2-0000-0000-000000000026',
  FILTER_TASK_PERSONAL: 'test-filter-p1-0000-0000-000000000027',
  FILTER_TASK_UNLABELED:'test-filter-nl-0000-0000-000000000028',
  // Breadcrumb test IDs
  CARD_LAB:       'test-card-lab0-0000-0000-000000000010',
  TASK_CLEANING:  'test-node-cln0-0000-0000-000000000011',
  TASK_TABLE:     'test-node-tbl0-0000-0000-000000000012',
  TODAY_CARD_BC:  'test-today-bc00-0000-0000-000000000013',
  TODAY_TABLE:    'test-node-tbl0-0000-0000-000000000012_today',
  TODAY_CLEANING: 'test-node-cln0-0000-0000-000000000011_today',
  // Linked drag/sync test IDs (issue #52)
  LINKED_TODAY_CARD:  'test-lnk-today-0000-0000-000000000029',
  LINKED_CARD_A:      'test-lnk-carda-0000-0000-000000000030',
  LINKED_TASK_A1:     'test-lnk-ta1--0000-0000-000000000031',
  LINKED_TASK_A2:     'test-lnk-ta2--0000-0000-000000000032',
  LINKED_GROUP:       'test-lnk-grp--0000-0000-000000000033',
  LINKED_TASK_A1_T:   'test-lnk-ta1--0000-0000-000000000031_today',
  LINKED_TASK_A2_T:   'test-lnk-ta2--0000-0000-000000000032_today',
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

// Returns 'YYYY-MM-DD' in LOCAL timezone for today or an offset (negative = past).
// Must match App.jsx's localDateString() which also uses local time — not UTC.
export function isoDate(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

/**
 * State with a Tomorrow's Tasks card containing one open task linked from Card A.
 * Used to test Tomorrow's Tasks toggle, linking, unlinking, and rollover.
 */
export function buildTomorrowState({ withTodayCard = false, lastCleanupDate = isoDate(-1) } = {}) {
  const nodes = {
    [IDS.CARD_A]: {
      ...node(IDS.CARD_A, null, [IDS.TASK_A1, IDS.TASK_A2], 'Card A'),
    },
    [IDS.TASK_A1]: {
      ...node(IDS.TASK_A1, IDS.CARD_A, [], 'Task A1'),
      labelIds: [IDS.TOMORROW_LABEL],
      linkedNodeIds: [IDS.TOMORROW_COPY],
    },
    [IDS.TASK_A2]: node(IDS.TASK_A2, IDS.CARD_A, [], 'Task A2'),
    [IDS.TOMORROW_CARD]: {
      ...node(IDS.TOMORROW_CARD, null, [IDS.TOMORROW_COPY], "Tomorrow's Tasks"),
      isTomorrowsTask: true,
    },
    [IDS.TOMORROW_COPY]: {
      ...node(IDS.TOMORROW_COPY, IDS.TOMORROW_CARD, [], 'Task A1'),
      isTomorrowsTask: true,
      linkedNodeIds: [IDS.TASK_A1],
    },
  }

  const rootOrder = withTodayCard
    ? [IDS.TOMORROW_CARD, IDS.CARD_A]
    : [IDS.TOMORROW_CARD, IDS.CARD_A]

  return {
    nodes,
    labels: {
      [IDS.TODAY_LABEL]: { id: IDS.TODAY_LABEL, name: 'Today', color: '#FCD34D', isSystem: true },
      [IDS.TOMORROW_LABEL]: { id: IDS.TOMORROW_LABEL, name: 'Tomorrow', color: '#93C5FD', isSystem: true },
    },
    rootOrder,
    activeFilters: {},
    todaysTasksRootId: null,
    todaysTasksLabelId: IDS.TODAY_LABEL,
    tomorrowsTasksRootId: IDS.TOMORROW_CARD,
    tomorrowsTasksLabelId: IDS.TOMORROW_LABEL,
    theme: 'light',
    dragMode: false,
    nestTargetId: null,
    nestZoneActive: false,
    history: [],
    lastCleanupDate,
  }
}

export async function setupTomorrowState(page, opts = {}) {
  await page.route('https://apis.google.com/**', route => route.abort())
  await page.route('https://accounts.google.com/**', route => route.abort())
  await injectState(page, buildTomorrowState(opts))
}

/**
 * State for filter tests:
 *   Card A: Work Task 1 (Work), Work Task 2 (Work), Unlabeled Task (no label)
 *   Card B: Personal Task (Personal)
 *
 * Custom labels: Work (#EF4444), Personal (#3B82F6)
 * This makes filter chips appear in the FilterBar.
 */
export function buildFilterState() {
  return {
    nodes: {
      [IDS.FILTER_CARD_A]: node(IDS.FILTER_CARD_A, null, [IDS.FILTER_TASK_WORK_1, IDS.FILTER_TASK_WORK_2, IDS.FILTER_TASK_UNLABELED], 'Card A'),
      [IDS.FILTER_CARD_B]: node(IDS.FILTER_CARD_B, null, [IDS.FILTER_TASK_PERSONAL], 'Card B'),
      [IDS.FILTER_TASK_WORK_1]: {
        ...node(IDS.FILTER_TASK_WORK_1, IDS.FILTER_CARD_A, [], 'Work Task 1'),
        labelIds: [IDS.LABEL_WORK],
      },
      [IDS.FILTER_TASK_WORK_2]: {
        ...node(IDS.FILTER_TASK_WORK_2, IDS.FILTER_CARD_A, [], 'Work Task 2'),
        labelIds: [IDS.LABEL_WORK],
      },
      [IDS.FILTER_TASK_UNLABELED]: node(IDS.FILTER_TASK_UNLABELED, IDS.FILTER_CARD_A, [], 'Unlabeled Task'),
      [IDS.FILTER_TASK_PERSONAL]: {
        ...node(IDS.FILTER_TASK_PERSONAL, IDS.FILTER_CARD_B, [], 'Personal Task'),
        labelIds: [IDS.LABEL_PERSONAL],
      },
    },
    labels: {
      [IDS.TODAY_LABEL]:    { id: IDS.TODAY_LABEL, name: 'Today', color: '#FCD34D', isSystem: true },
      [IDS.LABEL_WORK]:     { id: IDS.LABEL_WORK, name: 'Work', color: '#EF4444', isSystem: false },
      [IDS.LABEL_PERSONAL]: { id: IDS.LABEL_PERSONAL, name: 'Personal', color: '#3B82F6', isSystem: false },
    },
    rootOrder: [IDS.FILTER_CARD_A, IDS.FILTER_CARD_B],
    activeFilters: {},
    todaysTasksRootId: null,
    todaysTasksLabelId: IDS.TODAY_LABEL,
    theme: 'light',
    dragMode: false,
    nestTargetId: null,
    nestZoneActive: false,
    history: [],
    lastCleanupDate: null,
  }
}

export async function setupFilterState(page) {
  await page.route('https://apis.google.com/**', route => route.abort())
  await page.route('https://accounts.google.com/**', route => route.abort())
  await injectState(page, buildFilterState())
}

/**
 * State for linked-task drag/sync tests (issue #52):
 *   Card A
 *     └─ Task A1 (linked → A1_today)
 *     └─ Task A2 (linked → A2_today)
 *
 *   Today's Tasks
 *     └─ [Card A group] (auto-group, linked → Card A)
 *          └─ Task A1_today (linked → A1)
 *          └─ Task A2_today (linked → A2)
 */
export function buildLinkedDragState() {
  return {
    nodes: {
      [IDS.LINKED_CARD_A]: {
        ...node(IDS.LINKED_CARD_A, null, [IDS.LINKED_TASK_A1, IDS.LINKED_TASK_A2], 'Card A'),
        linkedNodeIds: [IDS.LINKED_GROUP],
      },
      [IDS.LINKED_TASK_A1]: {
        ...node(IDS.LINKED_TASK_A1, IDS.LINKED_CARD_A, [], 'Task A1'),
        labelIds: [IDS.TODAY_LABEL],
        linkedNodeIds: [IDS.LINKED_TASK_A1_T],
      },
      [IDS.LINKED_TASK_A2]: {
        ...node(IDS.LINKED_TASK_A2, IDS.LINKED_CARD_A, [], 'Task A2'),
        labelIds: [IDS.TODAY_LABEL],
        linkedNodeIds: [IDS.LINKED_TASK_A2_T],
      },
      [IDS.LINKED_TODAY_CARD]: {
        ...node(IDS.LINKED_TODAY_CARD, null, [IDS.LINKED_GROUP], "Today's Tasks"),
        isTodaysTask: true,
      },
      [IDS.LINKED_GROUP]: {
        ...node(IDS.LINKED_GROUP, IDS.LINKED_TODAY_CARD, [IDS.LINKED_TASK_A1_T, IDS.LINKED_TASK_A2_T], 'Card A'),
        isTodaysTask: true,
        isAutoGroupNode: true,
        linkedNodeIds: [IDS.LINKED_CARD_A],
      },
      [IDS.LINKED_TASK_A1_T]: {
        ...node(IDS.LINKED_TASK_A1_T, IDS.LINKED_GROUP, [], 'Task A1'),
        isTodaysTask: true,
        linkedNodeIds: [IDS.LINKED_TASK_A1],
      },
      [IDS.LINKED_TASK_A2_T]: {
        ...node(IDS.LINKED_TASK_A2_T, IDS.LINKED_GROUP, [], 'Task A2'),
        isTodaysTask: true,
        linkedNodeIds: [IDS.LINKED_TASK_A2],
      },
    },
    labels: {
      [IDS.TODAY_LABEL]: { id: IDS.TODAY_LABEL, name: 'Today', color: '#FCD34D', isSystem: true },
    },
    rootOrder: [IDS.LINKED_TODAY_CARD, IDS.LINKED_CARD_A],
    activeFilters: {},
    todaysTasksRootId: IDS.LINKED_TODAY_CARD,
    todaysTasksLabelId: IDS.TODAY_LABEL,
    theme: 'light',
    dragMode: false,
    nestTargetId: null,
    nestZoneActive: false,
    history: [],
    lastCleanupDate: null,
  }
}

export async function setupLinkedDragState(page) {
  await page.route('https://apis.google.com/**', route => route.abort())
  await page.route('https://accounts.google.com/**', route => route.abort())
  await injectState(page, buildLinkedDragState())
}
