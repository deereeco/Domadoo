// Fixed IDs for deterministic tests
export const IDS = {
  CARD_A: 'test-card-aaaa-0000-0000-000000000001',
  CARD_B: 'test-card-bbbb-0000-0000-000000000002',
  TASK_A1: 'test-node-a100-0000-0000-000000000003',
  TASK_A2: 'test-node-a200-0000-0000-000000000004',
  TASK_B1: 'test-node-b100-0000-0000-000000000005',
  TASK_B2: 'test-node-b200-0000-0000-000000000006',
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
  labels: {},
  rootOrder: [IDS.CARD_A, IDS.CARD_B],
  activeFilters: {},
  todaysTasksRootId: null,
  todaysTasksLabelId: null,
  theme: 'light',
  dragMode: false, // tests enable drag mode explicitly via the Drag toggle button
  nestTargetId: null,
  nestZoneActive: false,
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

  const user = MOCK_USER
  const state = MOCK_STATE
  await page.addInitScript(({ user, state }) => {
    // Inject mock state before store module runs
    localStorage.setItem('domadoo_user', JSON.stringify(user))
    localStorage.setItem('domadoo_state', JSON.stringify(state))

    // Stub window.google so initGoogleAuth doesn't throw and silentRequestToken is a no-op
    // (The store already has the user from localStorage, so no real auth is needed)
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
  }, { user, state })
}
