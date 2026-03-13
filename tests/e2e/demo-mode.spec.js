import { test, expect } from '@playwright/test'
import { setupMockState, setupDemoModeState, IDS } from './helpers/mockState.js'

test.describe('Demo mode', () => {
  // ── Modal opens correctly ────────────────────────────────────────────────────

  test('Demo button opens the demo modal (not a dropdown)', async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    await page.locator('[data-testid="demo-btn"]').click()
    await expect(page.locator('[data-testid="demo-modal"]')).toBeVisible()
    // Old dropdown items should not exist
    await expect(page.locator('text=Next day →')).not.toBeVisible()
    await expect(page.locator('text=Clear demo data')).not.toBeVisible()
  })

  test('Modal shows "Enter Demo Mode" when not in demo mode', async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    await page.locator('[data-testid="demo-btn"]').click()
    await expect(page.locator('[data-testid="enter-demo-btn"]')).toBeVisible()
    await expect(page.locator('[data-testid="exit-demo-btn"]')).not.toBeVisible()
  })

  test('Modal closes on Escape key', async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    await page.locator('[data-testid="demo-btn"]').click()
    await expect(page.locator('[data-testid="demo-modal"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="demo-modal"]')).not.toBeVisible()
  })

  test('Modal closes on backdrop click', async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    await page.locator('[data-testid="demo-btn"]').click()
    await expect(page.locator('[data-testid="demo-modal"]')).toBeVisible()
    // Click the backdrop (the outer fixed div)
    await page.locator('[data-testid="demo-modal"]').click({ position: { x: 10, y: 10 } })
    await expect(page.locator('[data-testid="demo-modal"]')).not.toBeVisible()
  })

  // ── Entering demo mode ───────────────────────────────────────────────────────

  test('Entering demo mode hides real tasks and shows demo tasks', async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    // Real tasks should be visible before demo mode
    await expect(page.locator('text=Card A')).toBeVisible()

    // Enter demo mode
    await page.locator('[data-testid="demo-btn"]').click()
    await page.locator('[data-testid="enter-demo-btn"]').click()
    await page.waitForTimeout(300)

    // Real tasks hidden, demo data visible
    await expect(page.locator('text=Card A')).not.toBeVisible()
    await expect(page.locator('text=Card B')).not.toBeVisible()
    // Demo card should be present (Today's Tasks card created by enterDemoMode)
    await expect(page.locator('[data-testid="today-tasks-card"]')).toBeVisible()
  })

  test('Demo button turns amber when in demo mode', async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    await page.locator('[data-testid="demo-btn"]').click()
    await page.locator('[data-testid="enter-demo-btn"]').click()
    await page.waitForTimeout(300)

    const demoBtn = page.locator('[data-testid="demo-btn"]')
    await expect(demoBtn).toHaveText('Demo ●')
    await expect(demoBtn).toHaveClass(/amber/)
  })

  // ── Demo mode active: modal shows scenarios ──────────────────────────────────

  test('Modal shows "Exit Demo Mode" and scenario card when in demo mode', async ({ page }) => {
    await setupDemoModeState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    await page.locator('[data-testid="demo-btn"]').click()
    await expect(page.locator('[data-testid="exit-demo-btn"]')).toBeVisible()
    await expect(page.locator('[data-testid="demo-scenario-nextday"]')).toBeVisible()
    await expect(page.locator('[data-testid="enter-demo-btn"]')).not.toBeVisible()
  })

  // ── Exiting demo mode ────────────────────────────────────────────────────────

  test('Exiting demo mode restores real tasks', async ({ page }) => {
    await setupDemoModeState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    // In demo mode — real tasks not visible
    await expect(page.locator('text=Card A')).not.toBeVisible()

    // Exit demo mode
    await page.locator('[data-testid="demo-btn"]').click()
    await page.locator('[data-testid="exit-demo-btn"]').click()
    await page.waitForTimeout(300)

    // Real tasks restored
    await expect(page.locator('text=Card A')).toBeVisible()
    await expect(page.locator('text=Card B')).toBeVisible()
    // Demo indicator gone
    await expect(page.locator('[data-testid="demo-btn"]')).toHaveText('Demo')
  })

  // ── Page refresh persists demo mode ─────────────────────────────────────────

  test('Demo mode persists across page refresh', async ({ page }) => {
    await setupDemoModeState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    // Verify in demo mode
    await expect(page.locator('[data-testid="demo-btn"]')).toHaveText('Demo ●')

    // Refresh the page
    await page.reload()
    await page.waitForSelector('[data-testid="board"]')

    // Still in demo mode after refresh
    await expect(page.locator('[data-testid="demo-btn"]')).toHaveText('Demo ●')
    // Can still exit
    await page.locator('[data-testid="demo-btn"]').click()
    await expect(page.locator('[data-testid="exit-demo-btn"]')).toBeVisible()
  })

  test('Real data is restored after page refresh + exit demo mode', async ({ page }) => {
    await setupDemoModeState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    await page.reload()
    await page.waitForSelector('[data-testid="board"]')

    // Exit demo mode after refresh
    await page.locator('[data-testid="demo-btn"]').click()
    await page.locator('[data-testid="exit-demo-btn"]').click()
    await page.waitForTimeout(300)

    // Real tasks restored
    await expect(page.locator('text=Card A')).toBeVisible()
    await expect(page.locator('text=Card B')).toBeVisible()
  })
})
