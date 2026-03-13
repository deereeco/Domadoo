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
