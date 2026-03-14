import { test, expect } from '@playwright/test'
import { setupBreadcrumbState, setupMockState, IDS } from './helpers/mockState.js'

test.describe('Breadcrumbs on Today\'s Tasks nodes', () => {
  test('shows breadcrumb with original hierarchy when subtask is direct child of Today root', async ({ page }) => {
    await setupBreadcrumbState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    const breadcrumb = page.locator(`[data-testid="breadcrumb-${IDS.TODAY_TABLE}"]`)
    await expect(breadcrumb).toBeVisible()
    await expect(breadcrumb).toContainText('Lab')
    await expect(breadcrumb).toContainText('Cleaning')
  })

  test('breadcrumb does NOT appear when parent today-copy provides context', async ({ page }) => {
    await setupBreadcrumbState(page, { nested: true })
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    // "table" is nested under "Cleaning" today-copy — no breadcrumb needed
    await expect(page.locator(`[data-testid="breadcrumb-${IDS.TODAY_TABLE}"]`)).toHaveCount(0)
  })

  test('breadcrumb does NOT appear on regular (non-today) cards', async ({ page }) => {
    await setupBreadcrumbState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    // TASK_TABLE is in the original "Lab" card — no breadcrumb on the original
    await expect(page.locator(`[data-testid="breadcrumb-${IDS.TASK_TABLE}"]`)).toHaveCount(0)
  })

  test('hide button collapses breadcrumb; clicking again restores it', async ({ page }) => {
    await setupBreadcrumbState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    const breadcrumb = page.locator(`[data-testid="breadcrumb-${IDS.TODAY_TABLE}"]`)
    await expect(breadcrumb).toBeVisible()

    // Hover to reveal hide/erase buttons, then click hide
    await breadcrumb.hover()
    await page.locator(`[data-testid="breadcrumb-${IDS.TODAY_TABLE}"] button[title="Hide breadcrumb"]`).click({ force: true })
    await page.waitForTimeout(100)

    // Breadcrumb div gone, "origin hidden" button visible
    await expect(breadcrumb).toHaveCount(0)
    const restoreBtn = page.locator(`[data-testid="today-tasks-card"] button[title="Show origin"]`)
    await expect(restoreBtn).toBeVisible()

    // Click restore
    await restoreBtn.click()
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-testid="breadcrumb-${IDS.TODAY_TABLE}"]`)).toBeVisible()
  })

  test('erase button permanently removes breadcrumb', async ({ page }) => {
    await setupBreadcrumbState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    const breadcrumb = page.locator(`[data-testid="breadcrumb-${IDS.TODAY_TABLE}"]`)
    await expect(breadcrumb).toBeVisible()

    // Hover to reveal, click erase
    await breadcrumb.hover()
    await page.locator(`[data-testid="breadcrumb-${IDS.TODAY_TABLE}"] button[title="Erase breadcrumb"]`).click({ force: true })
    await page.waitForTimeout(100)

    // Breadcrumb gone and no restore button either
    await expect(page.locator(`[data-testid="breadcrumb-${IDS.TODAY_TABLE}"]`)).toHaveCount(0)
    await expect(page.locator(`[data-testid="today-tasks-card"] button[title="Show origin"]`)).toHaveCount(0)
  })
})
