import { test, expect } from '@playwright/test'
import { setupSubtaskCleanupState, IDS } from './helpers/mockState.js'

test.describe('Subtask-aware archiving (issue #22)', () => {

  test('task with root COMPLETED but open subtask does NOT appear in cleanup modal', async ({ page }) => {
    await setupSubtaskCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
    // No cleanup modal — the partially-done task auto-stays, nothing to resolve
    await expect(page.locator('[data-testid="cleanup-done-btn"]')).not.toBeVisible()
  })

  test('task with root COMPLETED but open subtask stays in Today\'s Tasks', async ({ page }) => {
    await setupSubtaskCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard.locator('text=Cleaning')).toBeVisible()
    await expect(todayCard.locator('text=windows')).toBeVisible()
  })

  test('task with root COMPLETED but open subtask is NOT archived to history', async ({ page }) => {
    await setupSubtaskCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
    // No history snapshots created → date select not visible
    await expect(page.locator('[data-testid="history-date-select"]')).not.toBeVisible()
  })

  test('completed subtask checkbox shows completion date as title attribute', async ({ page }) => {
    await setupSubtaskCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
    const checkbox = page.locator(`[data-testid="checkbox-${IDS.SUBTASK_DONE_TODAY}"]`)
    const title = await checkbox.getAttribute('title')
    expect(title).toMatch(/Completed/)
  })

})
