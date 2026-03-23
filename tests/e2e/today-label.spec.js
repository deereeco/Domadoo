import { test, expect } from '@playwright/test'
import { setupMockState, IDS } from './helpers/mockState.js'

// Helper: open node Actions menu → Label → click Today label
async function assignTodayLabel(page, nodeId) {
  const node = page.locator(`[data-testid="node-${nodeId}"]`)
  await node.hover()
  await node.locator('button[title="Actions"]').click({ force: true })
  await page.waitForTimeout(100)
  await page.getByRole('button', { name: 'Label', exact: true }).click()
  await page.waitForTimeout(100)
  await page.getByRole('button', { name: 'Today', exact: true }).click({ force: true })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
}

// Helper: open node Actions menu → Delete
async function deleteNode(page, nodeId) {
  const node = page.locator(`[data-testid="node-${nodeId}"]`)
  await node.hover()
  await node.locator('button[title="Actions"]').click({ force: true })
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.waitForTimeout(100)
}

// Helper: open card overflow menu and click the Today toggle button
async function toggleCardToday(page, cardId) {
  const header = page.locator(`[data-testid="card-header-${cardId}"]`)
  await header.locator('button[title="Actions"]').click()
  await page.locator(`[data-testid="today-toggle-card-${cardId}"]`).click()
  await page.waitForTimeout(200)
}

test.describe('Today label', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
  })

  // ── Today label always present ────────────────────────────────────────────

  test('Today label is visible in label assigner by default', async ({ page }) => {
    const node = page.locator(`[data-testid="node-${IDS.TASK_A1}"]`)
    await node.hover()
    await node.locator('button[title="Actions"]').click({ force: true })
    await page.waitForTimeout(100)
    await page.getByRole('button', { name: 'Label', exact: true }).click()
    await page.waitForTimeout(100)
    // Today label button should be present in the label assigner
    await expect(page.locator('[data-testid="label-assigner"]').getByRole('button', { name: 'Today', exact: true })).toBeVisible({ timeout: 3000 })
  })

  // ── Assigning Today label creates Today's Tasks card + linked copy ────────

  test("assigning Today label to a task auto-creates Today's Tasks card", async ({ page }) => {
    await assignTodayLabel(page, IDS.TASK_A1)
    await expect(page.locator('[data-testid="today-tasks-card"]')).toBeVisible()
  })

  test("assigned task appears as linked copy inside Today's Tasks", async ({ page }) => {
    await assignTodayLabel(page, IDS.TASK_A1)

    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard).toBeVisible()
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' }).first()).toBeVisible()
  })

  // ── Removing Today label removes linked copy ──────────────────────────────

  test("removing Today label via label pill removes linked copy from Today's Tasks", async ({ page }) => {
    await assignTodayLabel(page, IDS.TASK_A1)

    // Verify linked copy exists in Today's Tasks
    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' }).first()).toBeVisible()

    // Click the × on the Today label pill on the original Task A1 (in Card A)
    const taskA1 = page.locator(`[data-testid="node-${IDS.TASK_A1}"]`)
    await taskA1.locator(`[data-testid="label-pill-remove-${IDS.TODAY_LABEL}"]`).click({ force: true })
    await page.waitForTimeout(200)

    // Linked copy should be gone from Today's Tasks
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' })).toHaveCount(0)
  })

  test("removing Today label via label assigner removes linked copy from Today's Tasks", async ({ page }) => {
    // Open assigner via Actions menu and assign Today label — keep assigner open
    const node = page.locator(`[data-testid="node-${IDS.TASK_A1}"]`)
    await node.hover()
    await node.locator('button[title="Actions"]').click({ force: true })
    await page.waitForTimeout(100)
    await page.getByRole('button', { name: 'Label', exact: true }).click()
    await page.waitForTimeout(100)
    const todayBtn = page.getByRole('button', { name: 'Today', exact: true })
    await todayBtn.click({ force: true })
    await page.waitForTimeout(200)

    // Assigner is still open — click Today again to unassign
    await todayBtn.click({ force: true })
    await page.waitForTimeout(200)

    // Linked copy should never have persisted (or was removed)
    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' })).toHaveCount(0)
  })

  // ── Root card Today label ─────────────────────────────────────────────────

  test("assigning Today label to a root card links it to Today's Tasks", async ({ page }) => {
    await toggleCardToday(page, IDS.CARD_A)

    // Today's Tasks card should appear
    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard).toBeVisible()

    // A linked copy of Card A's content ("Card A") should appear inside Today's Tasks
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Card A' }).first()).toBeVisible()
  })

  test('root card shows amber Today pill when linked to Today\'s Tasks', async ({ page }) => {
    await toggleCardToday(page, IDS.CARD_A)

    // The Today label pill should be visible on Card A's header
    const cardA = page.locator(`[data-testid="card-${IDS.CARD_A}"]`)
    await expect(cardA.locator(`[data-testid="label-pill-${IDS.TODAY_LABEL}"]`)).toBeVisible()
  })

  test('adding root card to Today\'s Tasks absorbs existing subtask today label', async ({ page }) => {
    // First add subtask A1 individually to Today's Tasks
    await assignTodayLabel(page, IDS.TASK_A1)

    // Verify A1 has the today label pill
    const taskA1 = page.locator(`[data-testid="node-${IDS.TASK_A1}"]`)
    await expect(taskA1.locator(`[data-testid="label-pill-${IDS.TODAY_LABEL}"]`)).toBeVisible()

    // Now add the root card A to Today's Tasks — should absorb A1's individual label
    await toggleCardToday(page, IDS.CARD_A)

    // A1's today label pill should be gone (subsumed by the root card)
    await expect(taskA1.locator(`[data-testid="label-pill-${IDS.TODAY_LABEL}"]`)).toHaveCount(0)

    // Today's Tasks should still show Task A1 (inside Card A's copy)
    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' }).first()).toBeVisible()
  })

  test('removing Today pill from root card unlinks all nested copies', async ({ page }) => {
    await toggleCardToday(page, IDS.CARD_A)

    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' }).first()).toBeVisible()

    // Click the × on the Today pill in Card A's header
    const cardA = page.locator(`[data-testid="card-${IDS.CARD_A}"]`)
    await cardA.locator(`[data-testid="label-pill-remove-${IDS.TODAY_LABEL}"]`).click({ force: true })
    await page.waitForTimeout(200)

    // All nested copies should be removed from Today's Tasks
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' })).toHaveCount(0)
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A2' })).toHaveCount(0)
  })
})

// ── Root card nesting in Today's Tasks ────────────────────────────────────────

test.describe("Root card nesting in Today's Tasks", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
    // Link Card A to Today's Tasks before each test
    await toggleCardToday(page, IDS.CARD_A)
  })

  test("nested children appear in Today's Tasks when root card is linked", async ({ page }) => {
    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' }).first()).toBeVisible()
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A2' }).first()).toBeVisible()
  })

  test("adding child to original card syncs to Today's Tasks", async ({ page }) => {
    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    const nodesSel = '[data-testid^="node-"]:not([data-testid^="node-handle-"])'
    const countBefore = await todayCard.locator(nodesSel).count()

    // Add a new child to Card A (the original)
    await page.locator(`[data-testid="add-item-${IDS.CARD_A}"]`).click()
    await page.waitForTimeout(200)

    // A new linked node should appear in Today's Tasks too
    await expect(todayCard.locator(nodesSel)).toHaveCount(countBefore + 1)
  })

  test("adding child inside Today's Tasks syncs to original card", async ({ page }) => {
    const originalCard = page.locator(`[data-testid="card-${IDS.CARD_A}"]`)
    const nodesSel = '[data-testid^="node-"]:not([data-testid^="node-handle-"])'
    const countBefore = await originalCard.locator(nodesSel).count()

    // Press Enter inside Task A1's today copy to create a new sibling in the Today view
    const task_a1_today_id = `${IDS.TASK_A1}_today`
    const taskA1Today = page.locator(`[data-testid="node-${task_a1_today_id}"]`)
    await taskA1Today.locator('[contenteditable]').click()
    await taskA1Today.locator('[contenteditable]').press('Enter')
    await page.waitForTimeout(200)

    // The new node should also appear in the original Card A
    await expect(originalCard.locator(nodesSel)).toHaveCount(countBefore + 1)
  })

  test("deleting child from original removes it from Today's Tasks", async ({ page }) => {
    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' }).first()).toBeVisible()

    // Open Actions menu on Task A1 in the original card and delete
    await deleteNode(page, IDS.TASK_A1)
    // Confirm "Delete both" in the linked-node dialog (exact match to avoid strict mode violation)
    await page.getByRole('button', { name: 'Delete both', exact: true }).click()
    await page.waitForTimeout(200)

    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' })).toHaveCount(0)
  })

  test("unlinking root card removes all nested today copies", async ({ page }) => {
    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' }).first()).toBeVisible()

    // Click the sun toggle again to unlink Card A (via overflow menu)
    await toggleCardToday(page, IDS.CARD_A)

    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' })).toHaveCount(0)
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A2' })).toHaveCount(0)
  })
})
