import { test, expect } from '@playwright/test'
import { setupFilterState, setupMockState, IDS } from './helpers/mockState.js'

const WORK_CHIP = '[data-testid="filter-chip-work"]'
const PERSONAL_CHIP = '[data-testid="filter-chip-personal"]'
const CLEAR_BTN = '[data-testid="filter-clear"]'

// ── Filter chips visibility ───────────────────────────────────────────────────

test.describe('Filter bar visibility', () => {
  test('filter chips appear when labels are used on nodes', async ({ page }) => {
    await setupFilterState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    await expect(page.locator(WORK_CHIP)).toBeVisible()
    await expect(page.locator(PERSONAL_CHIP)).toBeVisible()
  })

  test('unlabeled chip is always visible even when no label chips exist', async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    // MOCK_STATE has no labels assigned to nodes, so only the unlabeled chip should appear
    await expect(page.locator('[data-testid="filter-chip-unlabeled"]')).toBeVisible()
    await expect(page.locator(WORK_CHIP)).not.toBeVisible()
  })
})

// ── Show filter ───────────────────────────────────────────────────────────────

test.describe('Show filter', () => {
  test.beforeEach(async ({ page }) => {
    await setupFilterState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
  })

  test('clicking chip once enters show mode with "show" badge', async ({ page }) => {
    await page.locator(WORK_CHIP).click()
    await expect(page.locator('[data-testid="filter-chip-work-badge"]')).toHaveText('show')
  })

  test('board/card-list stays visible after activating show filter', async ({ page }) => {
    // Regression test for the blank-page bug
    await page.locator(WORK_CHIP).click()
    await page.waitForTimeout(200)

    await expect(page.locator('[data-testid="board"]')).toBeVisible()
    await expect(page.locator('[data-testid="card-list"]')).toBeVisible()
  })

  test('nodes WITH the Work label remain visible', async ({ page }) => {
    await page.locator(WORK_CHIP).click()
    await page.waitForTimeout(200)

    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_WORK_1}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_WORK_2}"]`)).toBeVisible()
  })

  test('nodes WITHOUT the Work label are hidden', async ({ page }) => {
    await page.locator(WORK_CHIP).click()
    await page.waitForTimeout(200)

    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_UNLABELED}"]`)).not.toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_PERSONAL}"]`)).not.toBeVisible()
  })

  test('card containing matching nodes is still shown', async ({ page }) => {
    await page.locator(WORK_CHIP).click()
    await page.waitForTimeout(200)

    await expect(page.locator(`[data-testid="card-${IDS.FILTER_CARD_A}"]`)).toBeVisible()
  })
})

// ── Hide filter ───────────────────────────────────────────────────────────────

test.describe('Hide filter', () => {
  test.beforeEach(async ({ page }) => {
    await setupFilterState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
    // Click twice to reach 'hide' mode
    await page.locator(WORK_CHIP).click()
    await page.locator(WORK_CHIP).click()
    await page.waitForTimeout(200)
  })

  test('chip shows "hide" badge in hide mode', async ({ page }) => {
    await expect(page.locator('[data-testid="filter-chip-work-badge"]')).toHaveText('hide')
  })

  test('board/card-list stays visible after activating hide filter', async ({ page }) => {
    await expect(page.locator('[data-testid="board"]')).toBeVisible()
    await expect(page.locator('[data-testid="card-list"]')).toBeVisible()
  })

  test('nodes WITH the Work label are hidden', async ({ page }) => {
    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_WORK_1}"]`)).not.toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_WORK_2}"]`)).not.toBeVisible()
  })

  test('nodes WITHOUT the Work label remain visible', async ({ page }) => {
    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_UNLABELED}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_PERSONAL}"]`)).toBeVisible()
  })
})

// ── Clearing filters ──────────────────────────────────────────────────────────

test.describe('Clearing filters', () => {
  test.beforeEach(async ({ page }) => {
    await setupFilterState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
  })

  test('Clear button appears when a filter is active', async ({ page }) => {
    await page.locator(WORK_CHIP).click()
    await page.waitForTimeout(100)
    await expect(page.locator(CLEAR_BTN)).toBeVisible()
  })

  test('clicking Clear restores all nodes to visible', async ({ page }) => {
    await page.locator(WORK_CHIP).click()
    await page.waitForTimeout(100)
    await page.locator(CLEAR_BTN).click()
    await page.waitForTimeout(200)

    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_WORK_1}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_UNLABELED}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_PERSONAL}"]`)).toBeVisible()
  })

  test('Clear button disappears after clearing', async ({ page }) => {
    await page.locator(WORK_CHIP).click()
    await page.waitForTimeout(100)
    await page.locator(CLEAR_BTN).click()
    await page.waitForTimeout(200)

    await expect(page.locator(CLEAR_BTN)).not.toBeVisible()
  })
})

// ── Mode cycling ──────────────────────────────────────────────────────────────

test.describe('Mode cycling', () => {
  test.beforeEach(async ({ page }) => {
    await setupFilterState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
  })

  test('chip cycles null → show → hide → null', async ({ page }) => {
    // Initial: no badge
    await expect(page.locator('[data-testid="filter-chip-work-badge"]')).not.toBeVisible()

    // Click 1: show mode
    await page.locator(WORK_CHIP).click()
    await page.waitForTimeout(100)
    await expect(page.locator('[data-testid="filter-chip-work-badge"]')).toHaveText('show')

    // Click 2: hide mode
    await page.locator(WORK_CHIP).click()
    await page.waitForTimeout(100)
    await expect(page.locator('[data-testid="filter-chip-work-badge"]')).toHaveText('hide')

    // Click 3: back to null — no badge, no Clear button
    await page.locator(WORK_CHIP).click()
    await page.waitForTimeout(100)
    await expect(page.locator('[data-testid="filter-chip-work-badge"]')).not.toBeVisible()
    await expect(page.locator(CLEAR_BTN)).not.toBeVisible()
  })

  test('board stays intact through the full filter cycle', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.locator(WORK_CHIP).click()
      await page.waitForTimeout(150)
      await expect(page.locator('[data-testid="board"]')).toBeVisible()
      await expect(page.locator('[data-testid="card-list"]')).toBeVisible()
    }
  })
})

// ── Unlabeled filter ──────────────────────────────────────────────────────────

const UNLABELED_CHIP = '[data-testid="filter-chip-unlabeled"]'

test.describe('Unlabeled filter', () => {
  test.beforeEach(async ({ page }) => {
    await setupFilterState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
  })

  test('unlabeled chip is always visible in filter bar', async ({ page }) => {
    await expect(page.locator(UNLABELED_CHIP)).toBeVisible()
  })

  test('unlabeled chip appears before label chips', async ({ page }) => {
    const unlabeledBox = await page.locator(UNLABELED_CHIP).boundingBox()
    const workBox = await page.locator(WORK_CHIP).boundingBox()
    expect(unlabeledBox.x).toBeLessThan(workBox.x)
  })

  test('clicking once enters show mode and shows only unlabeled nodes', async ({ page }) => {
    await page.locator(UNLABELED_CHIP).click()
    await page.waitForTimeout(200)

    await expect(page.locator('[data-testid="filter-chip-unlabeled-badge"]')).toHaveText('show')
    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_UNLABELED}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_WORK_1}"]`)).not.toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_PERSONAL}"]`)).not.toBeVisible()
  })

  test('clicking twice enters hide mode and hides unlabeled nodes', async ({ page }) => {
    await page.locator(UNLABELED_CHIP).click()
    await page.locator(UNLABELED_CHIP).click()
    await page.waitForTimeout(200)

    await expect(page.locator('[data-testid="filter-chip-unlabeled-badge"]')).toHaveText('hide')
    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_UNLABELED}"]`)).not.toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_WORK_1}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_PERSONAL}"]`)).toBeVisible()
  })

  test('clicking three times clears the filter', async ({ page }) => {
    await page.locator(UNLABELED_CHIP).click()
    await page.locator(UNLABELED_CHIP).click()
    await page.locator(UNLABELED_CHIP).click()
    await page.waitForTimeout(200)

    await expect(page.locator('[data-testid="filter-chip-unlabeled-badge"]')).not.toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_UNLABELED}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.FILTER_TASK_WORK_1}"]`)).toBeVisible()
  })
})
