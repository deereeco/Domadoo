import { test, expect } from '@playwright/test'
import { setupMockState, IDS } from './helpers/mockState.js'

// Helper: open the label assigner for a node and click the Today label option
async function assignTodayLabel(page, nodeId) {
  await page.locator(`[data-testid="node-${nodeId}"]`).hover()
  await page.locator(`[data-testid="node-${nodeId}"] button[title="Add label"]`).click({ force: true })
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
    await page.locator(`[data-testid="node-${IDS.TASK_A1}"] button[title="Add label"]`).click({ force: true })
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
    await page.locator(`[data-testid="node-${IDS.TASK_A1}"] button[title="Add label"]`).click({ force: true })
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
