import { test, expect } from '@playwright/test'
import { setupMockState, IDS } from './helpers/mockState.js'

test.describe('Undo / Redo', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockState(page)
    await page.goto('/')
    await page.waitForSelector('[data-testid="board"]')
  })

  // Helper: open node actions menu and click Delete (for simple, non-linked nodes)
  async function deleteTask(page, taskId) {
    await page.locator(`[data-testid="node-${taskId}"]`).hover()
    await page.locator(`[data-testid="node-${taskId}"] button[title="Actions"]`).click()
    await page.getByText('Delete').last().click()
  }

  // ─── Button initial state ─────────────────────────────────────────────────

  test('undo button is disabled on fresh load', async ({ page }) => {
    await expect(page.locator('[data-testid="undo-btn"]')).toBeDisabled()
  })

  test('redo button is disabled on fresh load', async ({ page }) => {
    await expect(page.locator('[data-testid="redo-btn"]')).toBeDisabled()
  })

  test('undo button becomes enabled after a mutation', async ({ page }) => {
    await deleteTask(page, IDS.TASK_A1)
    await expect(page.locator('[data-testid="undo-btn"]')).toBeEnabled()
  })

  // ─── Delete task → undo ───────────────────────────────────────────────────

  test('delete task then Ctrl+Z restores it', async ({ page }) => {
    await deleteTask(page, IDS.TASK_A1)
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A1}"]`)).not.toBeVisible()
    await page.keyboard.press('Control+z')
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A1}"]`)).toBeVisible()
  })

  test('delete task then click undo button restores it', async ({ page }) => {
    await deleteTask(page, IDS.TASK_A1)
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A1}"]`)).not.toBeVisible()
    await page.locator('[data-testid="undo-btn"]').click()
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A1}"]`)).toBeVisible()
  })

  // ─── Delete card → undo ───────────────────────────────────────────────────

  test('delete card then Ctrl+Z restores card and its tasks', async ({ page }) => {
    await page.locator(`[data-testid="card-header-${IDS.CARD_A}"] button[title="Actions"]`).click()
    await page.getByText('Delete card').last().click()
    await page.locator('[data-testid="delete-card-confirm"]').click()
    await expect(page.locator(`[data-testid="card-${IDS.CARD_A}"]`)).not.toBeVisible()
    await page.keyboard.press('Control+z')
    await expect(page.locator(`[data-testid="card-${IDS.CARD_A}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A1}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A2}"]`)).toBeVisible()
  })

  // ─── Toggle complete → undo ───────────────────────────────────────────────

  test('toggle complete then Ctrl+Z unchecks the task', async ({ page }) => {
    const checkbox = page.locator(`[data-testid="checkbox-${IDS.TASK_A1}"]`)
    await checkbox.click()
    await expect(checkbox).toHaveClass(/bg-emerald/)
    await page.keyboard.press('Control+z')
    await expect(checkbox).not.toHaveClass(/bg-emerald/)
  })

  // ─── Undo → Redo ──────────────────────────────────────────────────────────

  test('undo then Ctrl+Shift+Z re-applies the deletion', async ({ page }) => {
    await deleteTask(page, IDS.TASK_A1)
    await page.keyboard.press('Control+z')
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A1}"]`)).toBeVisible()
    await expect(page.locator('[data-testid="redo-btn"]')).toBeEnabled()
    await page.keyboard.press('Control+Shift+z')
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A1}"]`)).not.toBeVisible()
  })

  test('undo then click redo button re-applies the deletion', async ({ page }) => {
    await deleteTask(page, IDS.TASK_A1)
    await page.keyboard.press('Control+z')
    await page.locator('[data-testid="redo-btn"]').click()
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A1}"]`)).not.toBeVisible()
  })

  // ─── New action clears redo stack ─────────────────────────────────────────

  test('new mutation after undo disables the redo button', async ({ page }) => {
    await deleteTask(page, IDS.TASK_A1)
    await page.keyboard.press('Control+z')
    await expect(page.locator('[data-testid="redo-btn"]')).toBeEnabled()
    // Perform a new action — this should clear the redo stack
    await deleteTask(page, IDS.TASK_A2)
    await expect(page.locator('[data-testid="redo-btn"]')).toBeDisabled()
  })

  // ─── Multiple undo steps ──────────────────────────────────────────────────

  test('multiple undo steps restore each action in reverse order', async ({ page }) => {
    await deleteTask(page, IDS.TASK_A1)
    await deleteTask(page, IDS.TASK_A2)
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A1}"]`)).not.toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A2}"]`)).not.toBeVisible()
    await page.keyboard.press('Control+z')
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A2}"]`)).toBeVisible()
    await page.keyboard.press('Control+z')
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A1}"]`)).toBeVisible()
  })

  // ─── Content editing ──────────────────────────────────────────────────────

  test('edit task text then blur then Ctrl+Z restores original text', async ({ page }) => {
    const ce = page.locator(`[data-nodeid="${IDS.TASK_A1}"] [contenteditable]`)
    await ce.click()
    await page.keyboard.press('Control+a')
    await page.keyboard.type('Changed text')
    // Blur by clicking the board background
    await page.locator('[data-testid="board"]').click({ position: { x: 10, y: 10 } })
    await page.keyboard.press('Control+z')
    await expect(ce).toHaveText('Task A1')
  })

  test('edit task text without changing it then Ctrl+Z does not alter state', async ({ page }) => {
    // Focus and blur without changing content — should NOT push to undo stack
    const ce = page.locator(`[data-nodeid="${IDS.TASK_A1}"] [contenteditable]`)
    await ce.click()
    // No typing, just blur
    await page.locator('[data-testid="board"]').click({ position: { x: 10, y: 10 } })
    // Undo button should still be disabled (no mutation happened)
    await expect(page.locator('[data-testid="undo-btn"]')).toBeDisabled()
  })

  // ─── Keyboard passthrough while typing ───────────────────────────────────

  test('Ctrl+Z while typing in a node does not trigger app undo', async ({ page }) => {
    // Create a prior state that app undo would reverse
    await deleteTask(page, IDS.TASK_A2)
    // Now enter edit mode in task A1
    const ce = page.locator(`[data-nodeid="${IDS.TASK_A1}"] [contenteditable]`)
    await ce.click()
    await page.keyboard.type('hello')
    // Ctrl+Z here should be browser-native text undo, NOT app undo
    await page.keyboard.press('Control+z')
    // TASK_A2 must still be absent — app undo was NOT triggered
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A2}"]`)).not.toBeVisible()
  })

  // ─── Add card → undo ─────────────────────────────────────────────────────

  test('add card then Ctrl+Z removes it', async ({ page }) => {
    const cardSel = '[data-testid^="card-"]:not([data-testid^="card-h"]):not([data-testid="card-list"])'
    const countBefore = await page.locator(cardSel).count()
    await page.locator('[data-testid="add-card-btn"]').click()
    await page.waitForTimeout(100)
    await expect(page.locator(cardSel)).toHaveCount(countBefore + 1)
    // Blur any focused element first so Ctrl+Z is captured by the board handler
    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(100)
    await expect(page.locator(cardSel)).toHaveCount(countBefore)
  })
})
