import { test, expect } from '@playwright/test'
import { setupMockState, IDS } from './helpers/mockState.js'

// Helper: open the label assigner for a node and click the Today label option
async function assignTodayLabel(page, nodeId) {
  await page.locator(`[data-testid="node-${nodeId}"]`).hover()
  await page.locator(`[data-testid="node-${nodeId}"] button[title="Add label (Ctrl+L)"]`).click({ force: true })
  // Scope button click to the node element to avoid matching header buttons
  await page.locator(`[data-testid="node-${nodeId}"]`).getByRole('button', { name: 'Today', exact: true }).click()
  // Close the assigner by pressing Escape
  await page.keyboard.press('Escape')
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
    await page.locator(`[data-testid="node-${IDS.TASK_A1}"]`).hover()
    await page.locator(`[data-testid="node-${IDS.TASK_A1}"] button[title="Add label (Ctrl+L)"]`).click({ force: true })
    // Today label button should be visible inside the dropdown (scoped to node)
    await expect(
      page.locator(`[data-testid="node-${IDS.TASK_A1}"]`).getByRole('button', { name: 'Today', exact: true })
    ).toBeVisible()
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
    // Open assigner and assign Today label — keep assigner open (no Escape)
    await page.locator(`[data-testid="node-${IDS.TASK_A1}"]`).hover()
    await page.locator(`[data-testid="node-${IDS.TASK_A1}"] button[title="Add label (Ctrl+L)"]`).click({ force: true })
    const todayBtn = page.locator(`[data-testid="node-${IDS.TASK_A1}"]`).getByRole('button', { name: 'Today', exact: true })
    await todayBtn.click()
    await page.waitForTimeout(200)

    // Assigner is still open — click Today again to unassign
    await todayBtn.click()
    await page.waitForTimeout(200)

    // Linked copy should never have persisted (or was removed)
    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' })).toHaveCount(0)
  })

  // ── Root card Today label ─────────────────────────────────────────────────

  test("assigning Today label to a root card links it to Today's Tasks", async ({ page }) => {
    // Click the sun (Today) toggle button on Card A's header
    await page.locator(`[data-testid="today-toggle-card-${IDS.CARD_A}"]`).click()
    await page.waitForTimeout(200)

    // Today's Tasks card should appear
    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard).toBeVisible()

    // A linked copy of Card A's content ("Card A") should appear inside Today's Tasks
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Card A' }).first()).toBeVisible()
  })
})

// ── Root card nesting in Today's Tasks ────────────────────────────────────────

test.describe("Root card nesting in Today's Tasks", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
    // Link Card A to Today's Tasks before each test
    await page.locator(`[data-testid="today-toggle-card-${IDS.CARD_A}"]`).click()
    await page.waitForTimeout(200)
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

    // Hover Task A1 in the original card and click delete
    const taskA1 = page.locator(`[data-testid="card-${IDS.CARD_A}"]`).locator(`[data-testid="node-${IDS.TASK_A1}"]`)
    await taskA1.hover()
    await taskA1.locator('button[title="Delete"]').click({ force: true })
    await page.waitForTimeout(100)
    // Confirm "Delete both" in the linked-node dialog (exact match to avoid strict mode violation)
    await page.getByRole('button', { name: 'Delete both', exact: true }).click()
    await page.waitForTimeout(200)

    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' })).toHaveCount(0)
  })

  test("unlinking root card removes all nested today copies", async ({ page }) => {
    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' }).first()).toBeVisible()

    // Click the sun toggle again to unlink Card A
    await page.locator(`[data-testid="today-toggle-card-${IDS.CARD_A}"]`).click()
    await page.waitForTimeout(200)

    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' })).toHaveCount(0)
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A2' })).toHaveCount(0)
  })
})
