import { test, expect } from '@playwright/test'
import { setupMockState, IDS } from './helpers/mockState.js'

test.describe('Delete card modal', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockState(page)
    await page.goto('/')
    await page.waitForSelector('[data-testid="board"]')
  })

  async function openDeleteModal(page, cardId) {
    await page.locator(`[data-testid="card-header-${cardId}"] button[title="Actions"]`).click()
    await page.getByText('Delete card').last().click()
    await expect(page.locator('[data-testid="delete-card-modal"]')).toBeVisible()
  }

  test('shows delete modal when Delete card is clicked', async ({ page }) => {
    await openDeleteModal(page, IDS.CARD_A)
    await expect(page.locator('[data-testid="delete-card-confirm"]')).toBeVisible()
    await expect(page.locator('[data-testid="delete-card-cancel"]')).toBeVisible()
  })

  test('cancel button dismisses modal without deleting', async ({ page }) => {
    await openDeleteModal(page, IDS.CARD_A)
    await page.locator('[data-testid="delete-card-cancel"]').click()
    await expect(page.locator('[data-testid="delete-card-modal"]')).not.toBeVisible()
    await expect(page.locator(`[data-testid="card-${IDS.CARD_A}"]`)).toBeVisible()
  })

  test('Escape key dismisses modal without deleting', async ({ page }) => {
    await openDeleteModal(page, IDS.CARD_A)
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="delete-card-modal"]')).not.toBeVisible()
    await expect(page.locator(`[data-testid="card-${IDS.CARD_A}"]`)).toBeVisible()
  })

  test('backdrop click dismisses modal without deleting', async ({ page }) => {
    await openDeleteModal(page, IDS.CARD_A)
    await page.locator('[data-testid="delete-card-modal"]').click({ position: { x: 10, y: 10 } })
    await expect(page.locator('[data-testid="delete-card-modal"]')).not.toBeVisible()
    await expect(page.locator(`[data-testid="card-${IDS.CARD_A}"]`)).toBeVisible()
  })

  test('confirm button deletes the card', async ({ page }) => {
    await openDeleteModal(page, IDS.CARD_A)
    await page.locator('[data-testid="delete-card-confirm"]').click()
    await expect(page.locator(`[data-testid="card-${IDS.CARD_A}"]`)).not.toBeVisible()
    await expect(page.locator('[data-testid="delete-card-modal"]')).not.toBeVisible()
  })
})
