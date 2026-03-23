import { test, expect } from '@playwright/test'
import { setupMockState, setupLinkedDragState, IDS } from './helpers/mockState.js'

// Selectors
const nodeHandle = (id) => `[data-testid="node-handle-${id}"]`
const cardHandle = (id) => `[data-testid="card-handle-${id}"]`

// Count ONLY card root elements (exclude handles, headers, and card-list)
const cardSelector = `[data-testid^="card-"]:not([data-testid^="card-h"]):not([data-testid="card-list"])`
// Count ONLY node root elements (exclude handles)
const nodeSelector = (parentId) =>
  `[data-testid="card-${parentId}"] [data-testid^="node-"]:not([data-testid^="node-handle-"])`

// Enable drag mode via the header toggle button
async function enableDragMode(page) {
  await page.locator('[data-testid="drag-toggle"]').click()
  await page.waitForTimeout(50)
}

// Drag from one element center to another element center.
// The drag activates after moving 10px (exceeds PointerSensor's 8px threshold).
async function dragTo(page, fromSelector, toSelector, { steps = 15, offsetY = 0 } = {}) {
  const from = page.locator(fromSelector)
  const to = page.locator(toSelector)
  const fromBox = await from.boundingBox()
  const toBox = await to.boundingBox()
  const srcX = fromBox.x + fromBox.width / 2
  const srcY = fromBox.y + fromBox.height / 2
  const tgtX = toBox.x + toBox.width / 2
  const tgtY = toBox.y + toBox.height / 2 + offsetY
  await page.mouse.move(srcX, srcY)
  await page.mouse.down()
  // Move slightly first to exceed the 8px PointerSensor activation threshold
  await page.mouse.move(srcX + 10, srcY, { steps: 3 })
  await page.mouse.move(tgtX, tgtY, { steps })
  await page.mouse.up()
  await page.waitForTimeout(150)
}

// Start a drag, activate it, then hold over target for nest-zone activation (400ms timer).
async function dragHoldNest(page, fromHandleSelector, toNodeSelector, holdMs = 600) {
  const from = page.locator(fromHandleSelector)
  const to = page.locator(toNodeSelector)
  const fromBox = await from.boundingBox()
  const toBox = await to.boundingBox()
  const srcX = fromBox.x + fromBox.width / 2
  const srcY = fromBox.y + fromBox.height / 2
  const tgtX = toBox.x + toBox.width / 2
  const tgtY = toBox.y + toBox.height / 2 // aim for center of the node element
  await page.mouse.move(srcX, srcY)
  await page.mouse.down()
  await page.mouse.move(srcX + 10, srcY, { steps: 3 })
  await page.mouse.move(tgtX, tgtY, { steps: 20 }) // more steps = smoother, less overshoot
  // Hold still — the 400ms nest timer needs this
  await page.waitForTimeout(holdMs)
  await page.mouse.up()
  await page.waitForTimeout(200)
}

test.describe('Drag and drop', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
  })

  // ── Smoke ────────────────────────────────────────────────────────────────────

  test('smoke: board renders with 2 cards', async ({ page }) => {
    await expect(page.locator(`[data-testid="card-${IDS.CARD_A}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="card-${IDS.CARD_B}"]`)).toBeVisible()
  })

  test('smoke: tasks are visible in their cards', async ({ page }) => {
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A1}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.TASK_A2}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.TASK_B1}"]`)).toBeVisible()
    await expect(page.locator(`[data-testid="node-${IDS.TASK_B2}"]`)).toBeVisible()
  })

  // ── UI interactions (dragMode: false) ─────────────────────────────────────

  test('add card: clicking New Card adds a card', async ({ page }) => {
    const before = await page.locator(cardSelector).count()
    await page.locator('[data-testid="add-card-btn"]').click()
    await page.waitForTimeout(100)
    const after = await page.locator(cardSelector).count()
    expect(after).toBe(before + 1)
  })

  test('add item: clicking Add item adds a task to card A', async ({ page }) => {
    const before = await page.locator(nodeSelector(IDS.CARD_A)).count()
    await page.locator(`[data-testid="add-item-${IDS.CARD_A}"]`).click()
    await page.waitForTimeout(100)
    const after = await page.locator(nodeSelector(IDS.CARD_A)).count()
    expect(after).toBe(before + 1)
  })

  // ── Drag interactions (requires dragMode: true) ────────────────────────────

  test('reorder tasks: drag Task A1 below Task A2 within Card A', async ({ page }) => {
    await enableDragMode(page)

    const task1Before = await page.locator(`[data-testid="node-${IDS.TASK_A1}"]`).boundingBox()
    const task2Before = await page.locator(`[data-testid="node-${IDS.TASK_A2}"]`).boundingBox()
    expect(task1Before.y).toBeLessThan(task2Before.y) // sanity: A1 starts above A2

    // Drag A1's handle to A2's bottom zone
    await dragTo(
      page,
      nodeHandle(IDS.TASK_A1),
      nodeHandle(IDS.TASK_A2),
      { steps: 15, offsetY: Math.floor(task2Before.height * 0.4) }
    )

    const task1After = await page.locator(`[data-testid="node-${IDS.TASK_A1}"]`).boundingBox()
    const task2After = await page.locator(`[data-testid="node-${IDS.TASK_A2}"]`).boundingBox()
    expect(task2After.y).toBeLessThan(task1After.y) // A2 is now above A1
  })

  test('nest task: drag Task A1 over Task A2 middle zone for 400ms nests it as child', async ({ page }) => {
    await enableDragMode(page)

    // Hold A1 over A2's center (middle zone) for 600ms — triggers the 400ms nest timer.
    // toNodeSelector targets the full node div; its center is the middle of the element
    // which falls in the "middle zone" of the zone-aware collision detector.
    await dragHoldNest(
      page,
      nodeHandle(IDS.TASK_A1),
      `[data-testid="node-${IDS.TASK_A2}"]`,
      600
    )

    // A1 should now be nested under A2:
    // - A1 renders BELOW A2 (child renders after parent)
    // - A1 is INDENTED (x > A2.x, due to ml-6 on the children container)
    const task1After = await page.locator(`[data-testid="node-${IDS.TASK_A1}"]`).boundingBox()
    const task2After = await page.locator(`[data-testid="node-${IDS.TASK_A2}"]`).boundingBox()

    expect(task2After.y).toBeLessThan(task1After.y) // A1 renders below A2
    expect(task1After.x).toBeGreaterThan(task2After.x) // A1 is indented
  })

  test('reorder cards: drag Card A to the position of Card B', async ({ page }) => {
    await enableDragMode(page)

    const cardABefore = await page.locator(`[data-testid="card-${IDS.CARD_A}"]`).boundingBox()
    const cardBBefore = await page.locator(`[data-testid="card-${IDS.CARD_B}"]`).boundingBox()

    // Drag Card A's handle to Card B's handle position
    await dragTo(page, cardHandle(IDS.CARD_A), cardHandle(IDS.CARD_B), { steps: 20 })

    const cardAAfter = await page.locator(`[data-testid="card-${IDS.CARD_A}"]`).boundingBox()
    const cardBAfter = await page.locator(`[data-testid="card-${IDS.CARD_B}"]`).boundingBox()

    // At least one card should have moved relative to the other
    const positionChanged =
      Math.abs(cardAAfter.x - cardABefore.x) > 5 ||
      Math.abs(cardAAfter.y - cardABefore.y) > 5 ||
      Math.abs(cardBAfter.x - cardBBefore.x) > 5 ||
      Math.abs(cardBAfter.y - cardBBefore.y) > 5

    expect(positionChanged).toBe(true)
  })

  test('extract to root: drag Task A1 to board drop zone creates a new card', async ({ page }) => {
    await enableDragMode(page)

    const handleBox = await page.locator(nodeHandle(IDS.TASK_A1)).boundingBox()
    const srcX = handleBox.x + handleBox.width / 2
    const srcY = handleBox.y + handleBox.height / 2

    // Start drag and activate it (move > 8px)
    await page.mouse.move(srcX, srcY)
    await page.mouse.down()
    await page.mouse.move(srcX + 10, srcY, { steps: 3 })

    // The board drop zone renders as soon as drag activates
    await page.waitForSelector('[data-testid="board-drop-zone"]', { timeout: 5000 })

    // Get the zone's actual position and move to it
    const boardZone = page.locator('[data-testid="board-drop-zone"]')
    await expect(boardZone).toBeVisible()
    const boardBox = await boardZone.boundingBox()
    await page.mouse.move(boardBox.x + boardBox.width / 2, boardBox.y + boardBox.height / 2, { steps: 15 })
    await page.waitForTimeout(100)
    await page.mouse.up()
    await page.waitForTimeout(200)

    // Task A1 should have been extracted from Card A — Card A has one fewer direct task
    const cardATasks = await page.locator(nodeSelector(IDS.CARD_A)).count()
    expect(cardATasks).toBeLessThanOrEqual(1)

    // And the board should have gained a new card (A1 becomes a root card)
    const totalCards = await page.locator(cardSelector).count()
    expect(totalCards).toBe(3) // CARD_A + CARD_B + extracted A1 as new card
  })
})

// ── Today's Tasks structural sync (issue #52) ─────────────────────────────────

test.describe('Today/source structural sync', () => {
  test.beforeEach(async ({ page }) => {
    await setupLinkedDragState(page)
    await page.goto('/Domadoo/')
    await page.waitForSelector('[data-testid="board"]')
    await enableDragMode(page)
  })

  test('reorder in Today copy syncs to source: drag A2_today above A1_today → A2 above A1 in source', async ({ page }) => {
    // Sanity: A1_today renders above A2_today before drag
    const a1tBefore = await page.locator(`[data-testid="node-${IDS.LINKED_TASK_A1_T}"]`).boundingBox()
    const a2tBefore = await page.locator(`[data-testid="node-${IDS.LINKED_TASK_A2_T}"]`).boundingBox()
    expect(a1tBefore.y).toBeLessThan(a2tBefore.y)

    // Drag A2_today above A1_today (drop on top half of A1_today)
    await dragTo(
      page,
      nodeHandle(IDS.LINKED_TASK_A2_T),
      nodeHandle(IDS.LINKED_TASK_A1_T),
      { steps: 15, offsetY: -Math.floor(a1tBefore.height * 0.4) }
    )

    // Today copy: A2_today should now be above A1_today
    const a1tAfter = await page.locator(`[data-testid="node-${IDS.LINKED_TASK_A2_T}"]`).boundingBox()
    const a2tAfter = await page.locator(`[data-testid="node-${IDS.LINKED_TASK_A1_T}"]`).boundingBox()
    expect(a1tAfter.y).toBeLessThan(a2tAfter.y)

    // Source (Card A): A2 should now be above A1
    const a1After = await page.locator(`[data-testid="node-${IDS.LINKED_TASK_A1}"]`).boundingBox()
    const a2After = await page.locator(`[data-testid="node-${IDS.LINKED_TASK_A2}"]`).boundingBox()
    expect(a2After.y).toBeLessThan(a1After.y)
  })

  test('nest in source syncs to Today copy: nesting A1 under A2 → A1_today nested under A2_today', async ({ page }) => {
    // Nest A1 under A2 in Card A (source) by holding over A2's center
    await dragHoldNest(
      page,
      nodeHandle(IDS.LINKED_TASK_A1),
      `[data-testid="node-${IDS.LINKED_TASK_A2}"]`,
      600
    )

    // Source: A1 should be indented (child of A2)
    const a1After = await page.locator(`[data-testid="node-${IDS.LINKED_TASK_A1}"]`).boundingBox()
    const a2After = await page.locator(`[data-testid="node-${IDS.LINKED_TASK_A2}"]`).boundingBox()
    expect(a2After.y).toBeLessThan(a1After.y)
    expect(a1After.x).toBeGreaterThan(a2After.x)

    // Today copy: A1_today should also be indented (child of A2_today)
    const a1tAfter = await page.locator(`[data-testid="node-${IDS.LINKED_TASK_A1_T}"]`).boundingBox()
    const a2tAfter = await page.locator(`[data-testid="node-${IDS.LINKED_TASK_A2_T}"]`).boundingBox()
    expect(a2tAfter.y).toBeLessThan(a1tAfter.y)
    expect(a1tAfter.x).toBeGreaterThan(a2tAfter.x)
  })
})
