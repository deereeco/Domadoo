/**
 * Mobile E2E tests — runs under the `mobile-chrome` Playwright project (iPhone 13).
 *
 * Covers:
 *  - Viewport & layout
 *  - Filter bar visibility and usability
 *  - LabelManager modal (on-screen, input focusable)
 *  - Filter chip cycling (no zoom regression)
 *  - Today's Tasks / Tomorrow's Tasks toggles
 *  - Clear filters
 *  - Task nodes visible and interactive
 *  - Drag mode toggle
 */

import { test, expect } from '@playwright/test'
import {
  setupMockState,
  setupFilterState,
  setupTomorrowState,
  isoDate,
  IDS,
} from './helpers/mockState.js'

// ── Viewport & layout ─────────────────────────────────────────────────────────

test.describe('Mobile layout', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
  })

  test('board renders within mobile viewport width', async ({ page }) => {
    const board = page.locator('[data-testid="board"]')
    await expect(board).toBeVisible()
    const box = await board.boundingBox()
    const viewport = page.viewportSize()
    expect(box.width).toBeLessThanOrEqual(viewport.width)
  })

  test('cards are visible on mobile', async ({ page }) => {
    await expect(page.locator(`[data-testid="card-${IDS.CARD_A}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="card-${IDS.CARD_B}"]`)).toBeVisible()
  })

  test('task nodes are visible on mobile', async ({ page }) => {
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A1}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.TASK_B1}"]`)).toBeVisible()
  })
})

// ── Filter bar ────────────────────────────────────────────────────────────────

test.describe('Mobile filter bar', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
  })

  test('filter bar is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="filter-bar"]')).toBeVisible()
  })

  test('unlabeled chip is visible in filter bar', async ({ page }) => {
    await expect(page.locator('[data-testid="filter-chip-unlabeled"]')).toBeVisible()
  })

  test('Labels button is visible in filter bar', async ({ page }) => {
    const labelsBtn = page.locator('[data-testid="filter-bar"] button', { hasText: 'Labels' })
    await expect(labelsBtn).toBeVisible()
  })
})

// ── LabelManager modal ────────────────────────────────────────────────────────

test.describe('Mobile LabelManager', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
  })

  test('opens when Labels button is tapped', async ({ page }) => {
    const labelsBtn = page.locator('[data-testid="filter-bar"] button', { hasText: 'Labels' })
    await labelsBtn.tap()
    await expect(page.locator('text=Label Manager')).toBeVisible()
  })

  test('modal stays within viewport bounds', async ({ page }) => {
    const labelsBtn = page.locator('[data-testid="filter-bar"] button', { hasText: 'Labels' })
    await labelsBtn.tap()
    await page.waitForSelector('text=Label Manager')

    const modal = page.locator('text=Label Manager').locator('../..')
    const box = await modal.boundingBox()
    const viewport = page.viewportSize()

    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
  })

  test('new label input is tappable without going off-screen', async ({ page }) => {
    const labelsBtn = page.locator('[data-testid="filter-bar"] button', { hasText: 'Labels' })
    await labelsBtn.tap()
    await page.waitForSelector('text=Label Manager')

    const input = page.locator('input[placeholder="New label name…"]')
    await expect(input).toBeVisible()
    const box = await input.boundingBox()
    const viewport = page.viewportSize()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
  })

  test('can type a label name and create it', async ({ page }) => {
    const labelsBtn = page.locator('[data-testid="filter-bar"] button', { hasText: 'Labels' })
    await labelsBtn.tap()
    await page.waitForSelector('text=Label Manager')

    const input = page.locator('input[placeholder="New label name…"]')
    await input.tap()
    await input.fill('Mobile Label')

    const addBtn = page.locator('button.bg-indigo-500', { hasText: 'Add' })
    await addBtn.tap()

    // Input should clear after creation
    await expect(input).toHaveValue('')
    // New label chip should appear in filter bar (filter bar auto-updates)
    await page.locator('[role="dialog"]').press('Escape').catch(() => {})
  })

  test('modal closes when backdrop is tapped', async ({ page }) => {
    const labelsBtn = page.locator('[data-testid="filter-bar"] button', { hasText: 'Labels' })
    await labelsBtn.tap()
    await page.waitForSelector('text=Label Manager')

    // Tap the backdrop (outside the modal box)
    await page.mouse.click(5, 5)
    await expect(page.locator('text=Label Manager')).not.toBeVisible()
  })
})

// ── Filter chips ──────────────────────────────────────────────────────────────

test.describe('Mobile filter chips', () => {
  test.beforeEach(async ({ page }) => {
    await setupFilterState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
  })

  test('work and personal chips are visible', async ({ page }) => {
    await expect(page.locator('[data-testid="filter-chip-work"]')).toBeVisible()
    await expect(page.locator('[data-testid="filter-chip-personal"]')).toBeVisible()
  })

  test('tapping chip once enters show mode', async ({ page }) => {
    await page.locator('[data-testid="filter-chip-work"]').tap()
    await expect(page.locator('[data-testid="filter-chip-work-badge"]')).toHaveText('show')
  })

  test('tapping chip twice enters hide mode', async ({ page }) => {
    await page.locator('[data-testid="filter-chip-work"]').tap()
    await page.waitForTimeout(100)
    await page.locator('[data-testid="filter-chip-work"]').tap()
    await expect(page.locator('[data-testid="filter-chip-work-badge"]')).toHaveText('hide')
  })

  test('tapping chip three times clears mode', async ({ page }) => {
    await page.locator('[data-testid="filter-chip-work"]').tap()
    await page.waitForTimeout(100)
    await page.locator('[data-testid="filter-chip-work"]').tap()
    await page.waitForTimeout(100)
    await page.locator('[data-testid="filter-chip-work"]').tap()
    await page.waitForTimeout(100)
    await expect(page.locator('[data-testid="filter-chip-work-badge"]')).not.toBeVisible()
  })

  test('board stays visible after tapping filter chip (no blank page)', async ({ page }) => {
    await page.locator('[data-testid="filter-chip-work"]').tap()
    await page.waitForTimeout(200)
    await expect(page.locator('[data-testid="board"]')).toBeVisible()
    await expect(page.locator('[data-testid="card-list"]')).toBeVisible()
  })

  test('unlabeled chip cycles modes on mobile', async ({ page }) => {
    await page.locator('[data-testid="filter-chip-unlabeled"]').tap()
    await expect(page.locator('[data-testid="filter-chip-unlabeled-badge"]')).toHaveText('show')
  })

  test('clear button appears after activating a filter and clears on tap', async ({ page }) => {
    await page.locator('[data-testid="filter-chip-work"]').tap()
    await expect(page.locator('[data-testid="filter-clear"]')).toBeVisible()

    await page.locator('[data-testid="filter-clear"]').tap()
    await expect(page.locator('[data-testid="filter-chip-work-badge"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="filter-clear"]')).not.toBeVisible()
  })
})

// ── Today's Tasks toggle ──────────────────────────────────────────────────────

test.describe("Mobile Today's Tasks toggle", () => {
  test("Today's Tasks button is visible in filter bar", async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')

    const btn = page.locator('[data-testid="filter-bar"] button', { hasText: "Today's Tasks" })
    await expect(btn).toBeVisible()
  })
})

// ── Tomorrow's Tasks toggle ───────────────────────────────────────────────────

test.describe("Mobile Tomorrow's Tasks toggle", () => {
  test.beforeEach(async ({ page }) => {
    // Use null lastCleanupDate to prevent any cleanup/rollover on load
    await setupTomorrowState(page, { lastCleanupDate: null })
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
  })

  test("Tomorrow's Tasks card is visible by default", async ({ page }) => {
    await expect(page.locator('[data-testid="tomorrow-tasks-card"]')).toBeVisible()
  })

  test("tapping Tomorrow's Tasks toggle hides the card", async ({ page }) => {
    const toggleBtn = page.locator('[data-testid="toggle-tomorrows-tasks"]')
    await expect(toggleBtn).toBeVisible()
    await toggleBtn.tap()
    await page.waitForTimeout(200)
    await expect(page.locator('[data-testid="tomorrow-tasks-card"]')).toHaveCount(0)
  })

  test("tapping Tomorrow's Tasks toggle twice restores the card", async ({ page }) => {
    const toggleBtn = page.locator('[data-testid="toggle-tomorrows-tasks"]')
    await toggleBtn.tap()
    await page.waitForTimeout(200)
    await toggleBtn.tap()
    await page.waitForTimeout(200)
    await expect(page.locator('[data-testid="tomorrow-tasks-card"]')).toBeVisible()
  })
})

// ── Drag mode toggle ──────────────────────────────────────────────────────────

test.describe('Mobile drag mode toggle', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
  })

  test('drag toggle button is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="drag-toggle"]')).toBeVisible()
  })

  test('tapping drag toggle is tappable without error', async ({ page }) => {
    const toggle = page.locator('[data-testid="drag-toggle"]')
    await toggle.tap()
    // Board should still be functional
    await expect(page.locator('[data-testid="board"]')).toBeVisible()
  })
})
