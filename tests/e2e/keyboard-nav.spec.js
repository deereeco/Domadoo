import { test, expect } from '@playwright/test'
import { setupMockState, IDS } from './helpers/mockState.js'

// Helpers
const focusedTestId = (page) =>
  page.evaluate(() => document.activeElement?.dataset?.testid ?? null)

const isContentEditableFocused = (page) =>
  page.evaluate(() => document.activeElement?.contentEditable === 'true')

const focusEl = (page, testId) =>
  page.locator(`[data-testid="${testId}"]`).focus()

// Indent TASK_A2 under TASK_A1 to create a parent→child relationship for expand/collapse tests
async function indentA2UnderA1(page) {
  await focusEl(page, `node-${IDS.TASK_A2}`)
  await page.keyboard.press('Enter')   // enter edit mode
  await page.keyboard.press('Tab')     // indent under TASK_A1
  await page.waitForTimeout(150)
  await page.keyboard.press('Escape')  // return to nav mode
}

test.beforeEach(async ({ page }) => {
  await setupMockState(page)
  await page.goto('/')
  await page.waitForSelector('[data-testid="board"]')
})

// ─── Card header keyboard nav ──────────────────────────────────────────────

test.describe('Card header keyboard nav', () => {
  test('Enter on focused card header starts editing title', async ({ page }) => {
    await focusEl(page, `card-header-${IDS.CARD_A}`)
    await page.keyboard.press('Enter')
    expect(await isContentEditableFocused(page)).toBe(true)
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
    expect(await focusedTestId(page)).toBe(`card-header-${IDS.CARD_A}`)
  })

  test('Tab from card header jumps to next card header', async ({ page }) => {
    await focusEl(page, `card-header-${IDS.CARD_A}`)
    await page.keyboard.press('Tab')
    expect(await focusedTestId(page)).toBe(`card-header-${IDS.CARD_B}`)
  })

  test('Shift+Tab from card header jumps to prev card header', async ({ page }) => {
    await focusEl(page, `card-header-${IDS.CARD_B}`)
    await page.keyboard.press('Shift+Tab')
    expect(await focusedTestId(page)).toBe(`card-header-${IDS.CARD_A}`)
  })

  test('Tab from last card header does nothing (no wrap)', async ({ page }) => {
    await focusEl(page, `card-header-${IDS.CARD_B}`)
    await page.keyboard.press('Tab')
    // Still on card B header (no next card)
    expect(await focusedTestId(page)).toBe(`card-header-${IDS.CARD_B}`)
  })

  test('↓ from card header focuses first task in that card', async ({ page }) => {
    await focusEl(page, `card-header-${IDS.CARD_A}`)
    await page.keyboard.press('ArrowDown')
    expect(await focusedTestId(page)).toBe(`node-${IDS.TASK_A1}`)
  })

  test('↑ from card header focuses last task in previous card', async ({ page }) => {
    await focusEl(page, `card-header-${IDS.CARD_B}`)
    await page.keyboard.press('ArrowUp')
    expect(await focusedTestId(page)).toBe(`node-${IDS.TASK_A2}`)
  })

  test('↑ from first card header does nothing', async ({ page }) => {
    await focusEl(page, `card-header-${IDS.CARD_A}`)
    await page.keyboard.press('ArrowUp')
    // Still on card A header (no previous card)
    expect(await focusedTestId(page)).toBe(`card-header-${IDS.CARD_A}`)
  })
})

// ─── Arrow key navigation within a card ───────────────────────────────────

test.describe('Arrow key navigation within a card', () => {
  test('↓ moves to next task in same card', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A1}`)
    await page.keyboard.press('ArrowDown')
    expect(await focusedTestId(page)).toBe(`node-${IDS.TASK_A2}`)
  })

  test('↑ moves to previous task in same card', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A2}`)
    await page.keyboard.press('ArrowUp')
    expect(await focusedTestId(page)).toBe(`node-${IDS.TASK_A1}`)
  })

  test('↑ from first task focuses card header', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A1}`)
    await page.keyboard.press('ArrowUp')
    expect(await focusedTestId(page)).toBe(`card-header-${IDS.CARD_A}`)
  })

  test('↓ from last task stays put (no wrap)', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A2}`)
    await page.keyboard.press('ArrowDown')
    // Still on TASK_A2 — bottom of card, no next task
    expect(await focusedTestId(page)).toBe(`node-${IDS.TASK_A2}`)
  })

  test('Tab from a task jumps to next card header', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A1}`)
    await page.keyboard.press('Tab')
    expect(await focusedTestId(page)).toBe(`card-header-${IDS.CARD_B}`)
  })

  test('Shift+Tab from a task jumps to prev card header', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_B1}`)
    await page.keyboard.press('Shift+Tab')
    expect(await focusedTestId(page)).toBe(`card-header-${IDS.CARD_A}`)
  })
})

// ─── Arrow → / ← expand, collapse, parent ─────────────────────────────────

test.describe('Arrow → / ← expand, collapse, parent navigation', () => {
  test('→ on expanded node with children focuses first child', async ({ page }) => {
    await indentA2UnderA1(page)
    // TASK_A1 now has TASK_A2 as child and is expanded
    await focusEl(page, `node-${IDS.TASK_A1}`)
    await page.keyboard.press('ArrowRight')
    expect(await focusedTestId(page)).toBe(`node-${IDS.TASK_A2}`)
  })

  test('→ on collapsed node expands it', async ({ page }) => {
    await indentA2UnderA1(page)
    await focusEl(page, `node-${IDS.TASK_A1}`)
    // Collapse it first
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(100)
    // TASK_A2 should be hidden
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A2}"]`)).not.toBeVisible()
    // Now → should expand
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A2}"]`)).toBeVisible()
  })

  test('→ on a leaf node (no children) does nothing', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A1}`)
    await page.keyboard.press('ArrowRight')
    // Still focused on TASK_A1
    expect(await focusedTestId(page)).toBe(`node-${IDS.TASK_A1}`)
  })

  test('← on expanded node collapses it', async ({ page }) => {
    await indentA2UnderA1(page)
    await focusEl(page, `node-${IDS.TASK_A1}`)
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A2}"]`)).not.toBeVisible()
  })

  test('← on collapsed child focuses parent', async ({ page }) => {
    await indentA2UnderA1(page)
    await focusEl(page, `node-${IDS.TASK_A2}`)
    // TASK_A2 has no children so ← goes to parent (TASK_A1)
    await page.keyboard.press('ArrowLeft')
    expect(await focusedTestId(page)).toBe(`node-${IDS.TASK_A1}`)
  })
})

// ─── Navigation mode actions ───────────────────────────────────────────────

test.describe('Navigation mode actions', () => {
  test('Space on focused CHECKBOX task toggles it to COMPLETED', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A1}`)
    const checkboxBefore = page.locator(`[data-testid="node-${IDS.TASK_A1}"] button[class*="rounded"][class*="border"]`).first()
    await expect(checkboxBefore).not.toHaveClass(/bg-emerald/)
    await page.keyboard.press(' ')
    const checkboxAfter = page.locator(`[data-testid="node-${IDS.TASK_A1}"] button[class*="bg-emerald"]`).first()
    await expect(checkboxAfter).toBeVisible()
  })

  test('Ctrl+D on focused task opens the details modal', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A1}`)
    await page.keyboard.press('Control+d')
    await expect(page.locator('[data-testid="details-modal"]')).toBeVisible()
  })

  test('Ctrl+L on focused task opens the label assigner popup', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A1}`)
    await page.keyboard.press('Control+l')
    await expect(page.locator('[data-testid="label-assigner"]')).toBeVisible()
  })
})

// ─── Edit mode behaviour ───────────────────────────────────────────────────

test.describe('Edit mode behaviour', () => {
  test('Enter in edit mode creates sibling task below', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A1}`)
    await page.keyboard.press('Enter')
    expect(await isContentEditableFocused(page)).toBe(true)
    const countBefore = await page.locator(`[data-testid^="node-"]:not([data-testid^="node-handle-"])`).count()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(100)
    const countAfter = await page.locator(`[data-testid^="node-"]:not([data-testid^="node-handle-"])`).count()
    expect(countAfter).toBe(countBefore + 1)
  })

  test('Tab in edit mode indents task (regression guard)', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A2}`)
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)
    const nested = page.locator(`[data-testid="node-${IDS.TASK_A1}"] [data-testid="node-${IDS.TASK_A2}"]`)
    await expect(nested).toBeVisible()
  })

  test('Escape in edit mode blurs contentEditable and focuses node wrapper', async ({ page }) => {
    await focusEl(page, `node-${IDS.TASK_A1}`)
    await page.keyboard.press('Enter')
    expect(await isContentEditableFocused(page)).toBe(true)
    await page.keyboard.press('Escape')
    expect(await isContentEditableFocused(page)).toBe(false)
    expect(await focusedTestId(page)).toBe(`node-${IDS.TASK_A1}`)
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
  test('settings gear button is visible in header', async ({ page }) => {
    await expect(page.locator('[data-testid="settings-btn"]')).toBeVisible()
  })

  test('clicking ? in settings opens shortcut popover with at least 6 shortcuts', async ({ page }) => {
    await page.locator('[data-testid="settings-btn"]').click()
    await page.locator('[data-testid="keyboard-help-btn"]').click()
    const popover = page.locator('[data-testid="keyboard-help-popover"]')
    await expect(popover).toBeVisible()
    // Visual keyboard modal: count highlighted (active) keys with indigo styling
    const count = await popover.locator('div.bg-indigo-500').count()
    expect(count).toBeGreaterThanOrEqual(6)
  })

  test('Escape closes the shortcut popover', async ({ page }) => {
    await page.locator('[data-testid="settings-btn"]').click()
    await page.locator('[data-testid="keyboard-help-btn"]').click()
    const popover = page.locator('[data-testid="keyboard-help-popover"]')
    await expect(popover).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(popover).not.toBeVisible()
  })
})
