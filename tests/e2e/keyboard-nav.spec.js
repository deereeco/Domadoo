import { test, expect } from '@playwright/test'
import { setupMockState, IDS } from './helpers/mockState.js'

// Helper: which element currently has focus?
const focusedTestId = (page) =>
  page.evaluate(() => document.activeElement?.dataset?.testid ?? null)

const isContentEditableFocused = (page) =>
  page.evaluate(() => document.activeElement?.contentEditable === 'true')

// Focus a node wrapper or card header directly
const focusEl = (page, testId) =>
  page.locator(`[data-testid="${testId}"]`).focus()

test.beforeEach(async ({ page }) => {
  await setupMockState(page)
  await page.goto('/')
  await page.waitForSelector('[data-testid="board"]')
})

// ─── Tab-through navigation ────────────────────────────────────────────────

test.describe('Tab-through navigation', () => {
  test('Enter on focused card header starts editing title', async ({ page }) => {
    await focusEl(page, `card-header-${IDS.CARD_A}`)
    await page.keyboard.press('Enter')
    expect(await isContentEditableFocused(page)).toBe(true)
    // The focused element should be inside the card header
    const insideCard = await page.evaluate((cardId) => {
      const el = document.activeElement
      return !!el?.closest(`[data-testid="card-header-${cardId}"]`)
    }, IDS.CARD_A)
    expect(insideCard).toBe(true)
  })

  test('Escape from title edit returns focus to card header wrapper', async ({ page }) => {
    await focusEl(page, `card-header-${IDS.CARD_A}`)
    await page.keyboard.press('Enter')
    expect(await isContentEditableFocused(page)).toBe(true)
    await page.keyboard.press('Escape')
    expect(await isContentEditableFocused(page)).toBe(false)
    const focused = await focusedTestId(page)
    expect(focused).toBe(`card-header-${IDS.CARD_A}`)
  })

  test('Tab from card header focuses first task', async ({ page }) => {
    await focusEl(page, `card-header-${IDS.CARD_A}`)
    await page.keyboard.press('Tab')
    const focused = await focusedTestId(page)
    expect(focused).toBe(`node-${IDS.TASK_A1}`)
  })

  test('Tab through all tasks in DFS order', async ({ page }) => {
    await focusEl(page, `card-header-${IDS.CARD_A}`)
    const sequence = [
      `node-${IDS.TASK_A1}`,
      `node-${IDS.TASK_A2}`,
      `card-header-${IDS.CARD_B}`,
      `node-${IDS.TASK_B1}`,
      `node-${IDS.TASK_B2}`,
    ]
    for (const testId of sequence) {
      await page.keyboard.press('Tab')
      const focused = await focusedTestId(page)
      expect(focused).toBe(testId)
    }
  })

  test('Shift+Tab goes backward', async ({ page }) => {
    // Start at the last task and go backward
    await focusEl(page, `node-${IDS.TASK_B2}`)
    const sequence = [
      `node-${IDS.TASK_B1}`,
      `card-header-${IDS.CARD_B}`,
      `node-${IDS.TASK_A2}`,
      `node-${IDS.TASK_A1}`,
      `card-header-${IDS.CARD_A}`,
    ]
    for (const testId of sequence) {
      await page.keyboard.press('Shift+Tab')
      const focused = await focusedTestId(page)
      expect(focused).toBe(testId)
    }
  })
})

// ─── Navigation mode actions ───────────────────────────────────────────────

test.describe('Navigation mode actions', () => {
  test('Space on focused CHECKBOX task toggles it to COMPLETED', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A1}`)
    // Confirm it's not completed yet
    const checkboxBefore = page.locator(`[data-testid="node-${IDS.TASK_A1}"] button[class*="rounded"][class*="border"]`).first()
    await expect(checkboxBefore).not.toHaveClass(/bg-emerald/)
    await page.keyboard.press(' ')
    // After space, checkbox should be completed
    const checkboxAfter = page.locator(`[data-testid="node-${IDS.TASK_A1}"] button[class*="bg-emerald"]`).first()
    await expect(checkboxAfter).toBeVisible()
  })

  test('Ctrl+D on focused task opens the details modal', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A1}`)
    await page.keyboard.press('Control+d')
    // Details modal should appear — it shows breadcrumbs / node content
    const modal = page.locator('[data-testid="details-modal"]')
    await expect(modal).toBeVisible()
  })

  test('Ctrl+L on focused task opens the label assigner popup', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A1}`)
    await page.keyboard.press('Control+l')
    const assigner = page.locator('[data-testid="label-assigner"]')
    await expect(assigner).toBeVisible()
  })
})

// ─── Edit mode behaviour ───────────────────────────────────────────────────

test.describe('Edit mode behaviour', () => {
  test('Enter in edit mode creates sibling task below', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A1}`)
    await page.keyboard.press('Enter') // enter edit mode
    expect(await isContentEditableFocused(page)).toBe(true)
    const countBefore = await page.locator(`[data-testid^="node-"]:not([data-testid^="node-handle-"])`).count()
    await page.keyboard.press('Enter') // create sibling
    await page.waitForTimeout(100)
    const countAfter = await page.locator(`[data-testid^="node-"]:not([data-testid^="node-handle-"])`).count()
    expect(countAfter).toBe(countBefore + 1)
  })

  test('Tab in edit mode indents task (regression guard)', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A2}`)
    await page.keyboard.press('Enter') // enter edit mode
    // TASK_A2 starts at depth 0; Tab makes it a child of TASK_A1
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)
    // TASK_A2 should now be indented (child of TASK_A1) — check it's nested inside TASK_A1
    const nested = page.locator(`[data-testid="node-${IDS.TASK_A1}"] [data-testid="node-${IDS.TASK_A2}"]`)
    await expect(nested).toBeVisible()
  })

  test('Escape in edit mode blurs contentEditable and focuses node wrapper', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A1}`)
    await page.keyboard.press('Enter') // enter edit mode
    expect(await isContentEditableFocused(page)).toBe(true)
    await page.keyboard.press('Escape')
    expect(await isContentEditableFocused(page)).toBe(false)
    const focused = await focusedTestId(page)
    expect(focused).toBe(`node-${IDS.TASK_A1}`)
  })
})

// ─── Ctrl+Shift+N — new card ───────────────────────────────────────────────

test.describe('Ctrl+Shift+N — new card', () => {
  test('creates a new root card', async ({ page }) => {
    const sel = '[data-testid^="card-"]:not([data-testid^="card-h"]):not([data-testid="card-list"])'
    const countBefore = await page.locator(sel).count()
    await page.keyboard.press('Control+Shift+N')
    await page.waitForTimeout(100)
    const countAfter = await page.locator(sel).count()
    expect(countAfter).toBe(countBefore + 1)
  })

  test('new card title is immediately editable', async ({ page }) => {
    await page.keyboard.press('Control+Shift+N')
    await page.waitForTimeout(100)
    expect(await isContentEditableFocused(page)).toBe(true)
  })
})

// ─── ? keyboard help ──────────────────────────────────────────────────────

test.describe('Keyboard shortcuts help', () => {
  test('? button is visible in header', async ({ page }) => {
    const btn = page.locator('[data-testid="keyboard-help-btn"]')
    await expect(btn).toBeVisible()
  })

  test('clicking ? opens shortcut popover with at least 6 shortcuts', async ({ page }) => {
    await page.locator('[data-testid="keyboard-help-btn"]').click()
    const popover = page.locator('[data-testid="keyboard-help-popover"]')
    await expect(popover).toBeVisible()
    const rows = popover.locator('tr, li, [data-testid^="shortcut-"]')
    await expect(rows).toHaveCount.greaterThan ? null : null // flexible check
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(6)
  })

  test('Escape closes the shortcut popover', async ({ page }) => {
    await page.locator('[data-testid="keyboard-help-btn"]').click()
    const popover = page.locator('[data-testid="keyboard-help-popover"]')
    await expect(popover).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(popover).not.toBeVisible()
  })
})
