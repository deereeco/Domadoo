import { test, expect } from '@playwright/test'
import { setupCleanupState, IDS } from './helpers/mockState.js'

test.describe('Peek at board during cleanup', () => {

  // ── Peek button presence ────────────────────────────────────────────────────

  test('Peek button is visible in cleanup modal header', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="cleanup-done-btn"]')
    await expect(page.locator('[data-testid="cleanup-peek-btn"]')).toBeVisible()
  })

  // ── Entering peek mode ──────────────────────────────────────────────────────

  test('clicking Peek hides the cleanup modal', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="cleanup-done-btn"]')

    await page.locator('[data-testid="cleanup-peek-btn"]').click()

    await expect(page.locator('[data-testid="cleanup-done-btn"]')).not.toBeVisible()
  })

  test('clicking Peek reveals the board', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="cleanup-done-btn"]')

    await page.locator('[data-testid="cleanup-peek-btn"]').click()

    await expect(page.locator('[data-testid="board"]')).toBeVisible()
    await expect(page.locator('[data-testid="today-tasks-card"]')).toBeVisible()
  })

  test('PeekBanner appears after clicking Peek', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="cleanup-done-btn"]')

    await page.locator('[data-testid="cleanup-peek-btn"]').click()

    await expect(page.locator('[data-testid="peek-banner"]')).toBeVisible()
  })

  test('PeekBanner shows unresolved task count', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="cleanup-done-btn"]')

    // Resolve one of the 2 tasks before peeking
    await page.locator(`[data-testid="cleanup-action-today-${IDS.TODAY_INCOMPLETE}"]`).click()

    await page.locator('[data-testid="cleanup-peek-btn"]').click()

    // 1 remaining (the completed task hasn't been resolved yet)
    await expect(page.locator('[data-testid="peek-banner"]')).toContainText('1')
  })

  // ── Existing cards are locked ───────────────────────────────────────────────

  test('existing cards are dimmed during peek', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="cleanup-done-btn"]')

    await page.locator('[data-testid="cleanup-peek-btn"]').click()

    // Card A existed before peek — should have opacity-60 class
    const cardA = page.locator(`[data-testid="card-${IDS.CARD_A}"]`)
    await expect(cardA).toHaveClass(/opacity-60/)
  })

  test('existing cards have a blocking overlay during peek', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="cleanup-done-btn"]')

    await page.locator('[data-testid="cleanup-peek-btn"]').click()

    // Overlay div should exist inside the locked card
    const cardA = page.locator(`[data-testid="card-${IDS.CARD_A}"]`)
    await expect(cardA.locator('.absolute.inset-0.z-10.rounded-2xl')).toBeVisible()
  })

  // ── New cards are NOT locked ────────────────────────────────────────────────

  test('new card created during peek is not locked', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="cleanup-done-btn"]')

    await page.locator('[data-testid="cleanup-peek-btn"]').click()

    // Create a new card via the header button
    await page.locator('[data-testid="add-card-btn"]').click()
    await page.waitForTimeout(200)

    // Find cards that do NOT have opacity-60 on themselves — the new card should be the only one
    const unlockedCards = page.locator('[data-testid^="card-"]:not([data-testid^="card-h"]):not([data-testid="card-list"]):not(.opacity-60)')
    await expect(unlockedCards).toHaveCount(1)
  })

  test('new card created during peek has no blocking overlay', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="cleanup-done-btn"]')

    await page.locator('[data-testid="cleanup-peek-btn"]').click()
    await page.locator('[data-testid="add-card-btn"]').click()
    await page.waitForTimeout(200)

    // The new card should not contain a peek overlay
    const unlockedCard = page.locator('[data-testid^="card-"]:not([data-testid^="card-h"]):not([data-testid="card-list"]):not(.opacity-60)')
    await expect(unlockedCard.locator('.absolute.inset-0.z-10')).not.toBeAttached()
  })

  // ── Resuming cleanup ────────────────────────────────────────────────────────

  test('clicking Resume on PeekBanner restores the cleanup modal', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="cleanup-done-btn"]')

    await page.locator('[data-testid="cleanup-peek-btn"]').click()
    await expect(page.locator('[data-testid="cleanup-done-btn"]')).not.toBeVisible()

    await page.locator('[data-testid="peek-resume-btn"]').click()

    await expect(page.locator('[data-testid="cleanup-done-btn"]')).toBeVisible()
  })

  test('PeekBanner disappears after clicking Resume', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="cleanup-done-btn"]')

    await page.locator('[data-testid="cleanup-peek-btn"]').click()
    await page.locator('[data-testid="peek-resume-btn"]').click()

    await expect(page.locator('[data-testid="peek-banner"]')).not.toBeVisible()
  })

  test('previously resolved tasks are still resolved after peek round-trip', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="cleanup-done-btn"]')

    // Resolve the incomplete task before peeking
    await page.locator(`[data-testid="cleanup-action-today-${IDS.TODAY_INCOMPLETE}"]`).click()

    // Peek and resume
    await page.locator('[data-testid="cleanup-peek-btn"]').click()
    await page.locator('[data-testid="peek-resume-btn"]').click()

    // The "Keep for today" button should still appear selected (indigo background)
    const todayBtn = page.locator(`[data-testid="cleanup-action-today-${IDS.TODAY_INCOMPLETE}"]`)
    await expect(todayBtn).toHaveClass(/bg-indigo-600/)
  })

  test('Done button remains disabled if not all tasks resolved after peek', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="cleanup-done-btn"]')

    // Only resolve one task, peek, and resume
    await page.locator(`[data-testid="cleanup-action-today-${IDS.TODAY_INCOMPLETE}"]`).click()
    await page.locator('[data-testid="cleanup-peek-btn"]').click()
    await page.locator('[data-testid="peek-resume-btn"]').click()

    // Done still disabled because completed task not resolved
    await expect(page.locator('[data-testid="cleanup-done-btn"]')).toBeDisabled()
  })

  // ── PeekBanner disappears when cleanup is finalized ────────────────────────

  test('PeekBanner is gone after cleanup finalized (no pending tasks)', async ({ page }) => {
    await setupCleanupState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="cleanup-done-btn"]')

    // Resolve all, click Done
    await page.locator(`[data-testid="cleanup-action-today-${IDS.TODAY_INCOMPLETE}"]`).click()
    await page.locator(`[data-testid="cleanup-action-remove-${IDS.TODAY_COMPLETED}"]`).click()
    await page.locator('[data-testid="cleanup-done-btn"]').click()
    await page.waitForTimeout(300)

    await expect(page.locator('[data-testid="peek-banner"]')).not.toBeVisible()
  })

})
