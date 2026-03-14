import { test, expect } from '@playwright/test'
import { setupMockState, setupTomorrowState, IDS, isoDate } from './helpers/mockState.js'

// ── Toggle Tomorrow's Tasks card ──────────────────────────────────────────────

test.describe("Tomorrow's Tasks toggle", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
  })

  test("clicking Tomorrow's Tasks button creates and shows the card", async ({ page }) => {
    await expect(page.locator('[data-testid="tomorrow-tasks-card"]')).toHaveCount(0)
    await page.locator('[data-testid="toggle-tomorrows-tasks"]').click()
    await expect(page.locator('[data-testid="tomorrow-tasks-card"]')).toBeVisible()
  })

  test("clicking Tomorrow's Tasks button again hides the card", async ({ page }) => {
    await page.locator('[data-testid="toggle-tomorrows-tasks"]').click()
    await expect(page.locator('[data-testid="tomorrow-tasks-card"]')).toBeVisible()
    await page.locator('[data-testid="toggle-tomorrows-tasks"]').click()
    await expect(page.locator('[data-testid="tomorrow-tasks-card"]')).toHaveCount(0)
  })

  test("Tomorrow's Tasks button is highlighted (blue) when card is visible", async ({ page }) => {
    await page.locator('[data-testid="toggle-tomorrows-tasks"]').click()
    const btn = page.locator('[data-testid="toggle-tomorrows-tasks"]')
    await expect(btn).toHaveClass(/text-blue-700|text-blue-400/)
  })
})

// ── Assigning via card header button ─────────────────────────────────────────

test.describe("Tomorrow button on card header", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
    // Show Tomorrow's Tasks card first
    await page.locator('[data-testid="toggle-tomorrows-tasks"]').click()
    await page.waitForTimeout(200)
  })

  test("clicking Tomorrow button on Card A links it to Tomorrow's Tasks", async ({ page }) => {
    await page.locator(`[data-testid="tomorrow-toggle-card-${IDS.CARD_A}"]`).click()
    await page.waitForTimeout(200)

    const tomorrowCard = page.locator('[data-testid="tomorrow-tasks-card"]')
    await expect(tomorrowCard).toBeVisible()
    await expect(tomorrowCard.locator('[data-testid^="node-"]').filter({ hasText: 'Card A' }).first()).toBeVisible()
  })

  test("clicking Tomorrow button again unlinks Card A from Tomorrow's Tasks", async ({ page }) => {
    await page.locator(`[data-testid="tomorrow-toggle-card-${IDS.CARD_A}"]`).click()
    await page.waitForTimeout(200)

    const tomorrowCard = page.locator('[data-testid="tomorrow-tasks-card"]')
    await expect(tomorrowCard.locator('[data-testid^="node-"]').filter({ hasText: 'Card A' }).first()).toBeVisible()

    // Click again to unlink
    await page.locator(`[data-testid="tomorrow-toggle-card-${IDS.CARD_A}"]`).click()
    await page.waitForTimeout(200)

    await expect(tomorrowCard.locator('[data-testid^="node-"]').filter({ hasText: 'Card A' })).toHaveCount(0)
  })

  test("Today and Tomorrow buttons both hidden on Today/Tomorrow special cards", async ({ page }) => {
    // Tomorrow card itself should not have either button
    await expect(page.locator('[data-testid="tomorrow-tasks-card"] [data-testid^="today-toggle-card-"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="tomorrow-tasks-card"] [data-testid^="tomorrow-toggle-card-"]')).toHaveCount(0)
  })
})

// ── Assigning via NodeItem hover button ───────────────────────────────────────

test.describe("Tomorrow button on NodeItem", () => {
  test.beforeEach(async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
    await page.locator('[data-testid="toggle-tomorrows-tasks"]').click()
    await page.waitForTimeout(200)
  })

  test("hovering a task shows the Tomorrow button (moon icon)", async ({ page }) => {
    await page.locator(`[data-testid="node-${IDS.TASK_A1}"]`).hover()
    await expect(page.locator(`[data-testid="tomorrow-btn-${IDS.TASK_A1}"]`)).toBeVisible()
  })

  test("clicking Tomorrow button adds task copy to Tomorrow's Tasks", async ({ page }) => {
    await page.locator(`[data-testid="node-${IDS.TASK_A1}"]`).hover()
    await page.locator(`[data-testid="tomorrow-btn-${IDS.TASK_A1}"]`).click({ force: true })
    await page.waitForTimeout(200)

    const tomorrowCard = page.locator('[data-testid="tomorrow-tasks-card"]')
    await expect(tomorrowCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' }).first()).toBeVisible()
  })

  test("task already in Today's Tasks does not show Tomorrow button", async ({ page }) => {
    // Create Today's Tasks card first via FilterBar toggle
    await page.locator('button[title="Show Today\'s Tasks card"]').click()
    await page.waitForTimeout(200)

    // Add Task A1 to Today's Tasks via the sun icon
    await page.locator(`[data-testid="node-${IDS.TASK_A1}"]`).hover()
    await page.locator(`[data-testid="node-${IDS.TASK_A1}"] button[title="Add to Today's Tasks"]`).click({ force: true })
    await page.waitForTimeout(200)

    // Tomorrow button should not appear for a task already in Today
    await page.locator(`[data-testid="node-${IDS.TASK_A1}"]`).hover()
    await expect(page.locator(`[data-testid="tomorrow-btn-${IDS.TASK_A1}"]`)).toHaveCount(0)
  })
})

// ── Breadcrumb shows origin ───────────────────────────────────────────────────

test.describe("Tomorrow breadcrumb", () => {
  test.beforeEach(async ({ page }) => {
    // Use today's date so cleanup does NOT trigger and tomorrow copy stays
    await setupTomorrowState(page, { lastCleanupDate: isoDate(0) })
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
  })

  test("tomorrow copy shows breadcrumb with source card name", async ({ page }) => {
    const tomorrowCard = page.locator('[data-testid="tomorrow-tasks-card"]')
    await expect(tomorrowCard).toBeVisible()

    // The copy of Task A1 should show a breadcrumb pointing to "Card A"
    const breadcrumb = tomorrowCard.locator(`[data-testid="breadcrumb-tomorrow-${IDS.TOMORROW_COPY}"]`)
    await expect(breadcrumb).toBeVisible()
    await expect(breadcrumb).toContainText('Card A')
  })
})

// ── Unlinking via delete confirm ──────────────────────────────────────────────

test.describe("Tomorrow copy delete confirmation", () => {
  test.beforeEach(async ({ page }) => {
    // Use today's date so cleanup does NOT trigger and tomorrow copy stays
    await setupTomorrowState(page, { lastCleanupDate: isoDate(0) })
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
  })

  test("deleting tomorrow copy shows 'Remove from Tomorrow's Tasks?' dialog", async ({ page }) => {
    const copy = page.locator(`[data-testid="node-${IDS.TOMORROW_COPY}"]`)
    await copy.hover()
    await copy.locator('button[title="Delete"]').click({ force: true })
    await expect(page.getByText("Remove from Tomorrow's Tasks?")).toBeVisible()
  })

  test("'Remove only' removes copy but keeps original", async ({ page }) => {
    const copy = page.locator(`[data-testid="node-${IDS.TOMORROW_COPY}"]`)
    await copy.hover()
    await copy.locator('button[title="Delete"]').click({ force: true })
    await page.getByRole('button', { name: 'Remove only', exact: true }).click()
    await page.waitForTimeout(200)

    // Copy gone from Tomorrow's Tasks
    const tomorrowCard = page.locator('[data-testid="tomorrow-tasks-card"]')
    await expect(tomorrowCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' })).toHaveCount(0)

    // Original still exists in Card A
    const cardA = page.locator(`[data-testid="card-${IDS.CARD_A}"]`)
    await expect(cardA.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' }).first()).toBeVisible()
  })
})

// ── Rollover: Tomorrow → Today ────────────────────────────────────────────────

test.describe("Tomorrow → Today rollover", () => {
  test.beforeEach(async ({ page }) => {
    // lastCleanupDate = yesterday → cleanup triggers on load
    await setupTomorrowState(page, { lastCleanupDate: isoDate(-1) })
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
  })

  test("tomorrow tasks silently move into Today's Tasks at rollover", async ({ page }) => {
    // After rollover, Today's Tasks card should exist and contain Task A1
    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard).toBeVisible()
    await expect(todayCard.locator('[data-testid^="node-"]').filter({ hasText: 'Task A1' }).first()).toBeVisible()
  })

  test("Tomorrow's Tasks card is empty after rollover", async ({ page }) => {
    const tomorrowCard = page.locator('[data-testid="tomorrow-tasks-card"]')
    await expect(tomorrowCard).toBeVisible()
    await expect(tomorrowCard.locator('[data-testid^="node-"]:not([data-testid^="node-handle-"])')).toHaveCount(0)
  })

  test("rolled-over task has Today label on original", async ({ page }) => {
    // The original Task A1 in Card A should now have the Today label pill visible
    const cardA = page.locator(`[data-testid="card-${IDS.CARD_A}"]`)
    await expect(
      cardA.locator(`[data-testid="node-${IDS.TASK_A1}"]`).locator('[data-testid^="label-pill"]').filter({ hasText: 'Today' })
    ).toBeVisible()
  })
})
