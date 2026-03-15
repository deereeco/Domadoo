import { test, expect } from '@playwright/test'
import { setupMockState, setupCleanupState, setupFreshState, IDS, isoDate } from './helpers/mockState.js'

test.describe('Daily cleanup', () => {
  // ── First load / no cleanup needed ─────────────────────────────────────────

  test('no cleanup modal on fresh load (no lastCleanupDate)', async ({ page }) => {
    await setupFreshState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
    await expect(page.locator('[data-testid="cleanup-done-btn"]')).not.toBeVisible()
  })

  test('no cleanup modal when lastCleanupDate is already today', async ({ page }) => {
    await setupCleanupState(page, { lastCleanupDate: isoDate(0) })
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
    await expect(page.locator('[data-testid="cleanup-done-btn"]')).not.toBeVisible()
  })

  // ── Cleanup triggers when lastCleanupDate is in the past ───────────────────

  test('cleanup modal appears when lastCleanupDate is yesterday and incomplete tasks exist', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
    await expect(page.locator('[data-testid="cleanup-done-btn"]')).toBeVisible()
    // The incomplete task should be listed in the cleanup task list
    await expect(page.locator('[data-testid="cleanup-task-list"]').locator('text=Incomplete Task')).toBeVisible()
  })

  test('completed tasks appear in modal so user can choose to repeat or remove them', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
    // Completed Task SHOULD appear in cleanup modal (user decides what to do with it)
    await expect(page.locator('[data-testid="cleanup-task-list"]').locator('text=Completed Task')).toBeVisible()
    // Repeat and Remove buttons should be present for the completed task
    await expect(page.locator(`[data-testid="cleanup-action-repeat-${IDS.TODAY_COMPLETED}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="cleanup-action-remove-${IDS.TODAY_COMPLETED}"]`)).toBeVisible()
  })

  // ── Resolve: Move to Today ─────────────────────────────────────────────────

  test('resolving incomplete task as → Today keeps it in Today\'s Tasks', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    // Click "→ Today" for the incomplete task
    await page.locator(`[data-testid="cleanup-action-today-${IDS.TODAY_INCOMPLETE}"]`).click()
    // Also resolve the completed task (remove it)
    await page.locator(`[data-testid="cleanup-action-remove-${IDS.TODAY_COMPLETED}"]`).click()
    // Done button should now be enabled — click it
    await page.locator('[data-testid="cleanup-done-btn"]').click()
    await page.waitForTimeout(300)

    // Modal should be gone
    await expect(page.locator('[data-testid="cleanup-done-btn"]')).not.toBeVisible()

    // Task should still be in Today's Tasks card
    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard.locator('text=Incomplete Task')).toBeVisible()
  })

  // ── Resolve: Mark Complete ─────────────────────────────────────────────────

  test('resolving incomplete task as ✓ Done archives it to history', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    await page.locator(`[data-testid="cleanup-action-complete-${IDS.TODAY_INCOMPLETE}"]`).click()
    // Also resolve the completed task
    await page.locator(`[data-testid="cleanup-action-remove-${IDS.TODAY_COMPLETED}"]`).click()
    await page.locator('[data-testid="cleanup-done-btn"]').click()
    await page.waitForTimeout(300)

    // Modal should be gone
    await expect(page.locator('[data-testid="cleanup-done-btn"]')).not.toBeVisible()

    // Task should NOT be in Today's Tasks card anymore
    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard.locator('text=Incomplete Task')).not.toBeVisible()

    // It should appear in the history board: select yesterday's snapshot from the date dropdown
    await expect(page.locator('[data-testid="history-date-select"]')).toBeVisible()
    await page.locator('[data-testid="history-date-select"]').selectOption(isoDate(-1))
    await expect(page.locator('[data-testid="history-board"]').locator('text=Incomplete Task')).toBeVisible()
  })

  // ── Resolve: Push Back ────────────────────────────────────────────────────

  test('resolving incomplete task as ↩ Push back removes it from Today\'s Tasks', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    await page.locator(`[data-testid="cleanup-action-pushback-${IDS.TODAY_INCOMPLETE}"]`).click()
    // Also resolve the completed task
    await page.locator(`[data-testid="cleanup-action-remove-${IDS.TODAY_COMPLETED}"]`).click()
    await page.locator('[data-testid="cleanup-done-btn"]').click()
    await page.waitForTimeout(300)

    // Modal should be gone
    await expect(page.locator('[data-testid="cleanup-done-btn"]')).not.toBeVisible()

    // Task should NOT be in Today's Tasks
    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard.locator('text=Incomplete Task')).not.toBeVisible()

    // Original task should still be in Card A
    const cardA = page.locator(`[data-testid="card-${IDS.CARD_A}"]`)
    await expect(cardA.locator('text=Incomplete Task')).toBeVisible()
  })

  // ── Apply All ─────────────────────────────────────────────────────────────

  test('"All → Today" + "All ↺ Repeat" bulk buttons resolve all tasks', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    await page.getByText('All → Today').click()
    await page.getByText('All ↺ Repeat').click()
    // Done button should now be enabled
    await expect(page.locator('[data-testid="cleanup-done-btn"]')).toBeEnabled()
    await page.locator('[data-testid="cleanup-done-btn"]').click()
    await page.waitForTimeout(300)

    await expect(page.locator('[data-testid="cleanup-done-btn"]')).not.toBeVisible()
    const todayCard = page.locator('[data-testid="today-tasks-card"]')
    await expect(todayCard.locator('text=Incomplete Task')).toBeVisible()
  })

  // ── History board ──────────────────────────────────────────────────────────

  test('completed tasks appear in History modal after cleanup', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    // Resolve all tasks so modal closes (incomplete → Today, completed → Remove)
    await page.getByText('All → Today').click()
    await page.getByText('All ✓ Remove').click()
    await page.locator('[data-testid="cleanup-done-btn"]').click()
    await page.waitForTimeout(300)

    // Open history: select yesterday's snapshot from the date dropdown
    await expect(page.locator('[data-testid="history-date-select"]')).toBeVisible()
    await page.locator('[data-testid="history-date-select"]').selectOption(isoDate(-1))
    await expect(page.locator('[data-testid="history-board"]')).toBeVisible()
    // The completed task should appear in the history board
    await expect(page.locator('[data-testid="history-board"]').getByText('Completed Task', { exact: true })).toBeVisible()
  })

  test('History date select shows snapshot from cleanup date', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    await page.getByText('All → Today').click()
    await page.getByText('All ✓ Remove').click()
    await page.locator('[data-testid="cleanup-done-btn"]').click()
    await page.waitForTimeout(300)

    // Select yesterday's snapshot from the date dropdown and verify the task is visible
    await expect(page.locator('[data-testid="history-date-select"]')).toBeVisible()
    await page.locator('[data-testid="history-date-select"]').selectOption(isoDate(-1))
    await expect(page.locator('[data-testid="history-board"]').getByText('Completed Task', { exact: true })).toBeVisible()
  })

  test('History date select is not shown when no completions exist', async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    // No history snapshots → date select should not be rendered
    await expect(page.locator('[data-testid="history-date-select"]')).not.toBeVisible()
  })

  // ── ?simulate=nextDay ──────────────────────────────────────────────────────

  test('?simulate=nextDay seeds demo tasks and triggers cleanup modal on empty board', async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/?simulate=nextDay')
    await page.waitForSelector('[data-testid="board"]')
    // Cleanup modal should appear (demo tasks include incomplete ones)
    await expect(page.locator('[data-testid="cleanup-done-btn"]')).toBeVisible()
  })

  test('?simulate=nextDay clears the URL param after load', async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/?simulate=nextDay')
    await page.waitForSelector('[data-testid="board"]')
    // URL should no longer contain the simulate param
    expect(page.url()).not.toContain('simulate=nextDay')
  })
})
