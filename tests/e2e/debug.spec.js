import { test } from '@playwright/test'
import { setupMockState } from './helpers/mockState.js'

test('debug: board renders with mock auth', async ({ page }) => {
  await setupMockState(page)
  page.on('console', msg => {
    const text = msg.text()
    if (msg.type() === 'error' || text.includes('[auth]') || text.includes('Error'))
      console.log('PAGE LOG:', text)
  })

  await page.goto('/Domadoo/')
  await page.waitForTimeout(3000)

  const testids = await page.$$eval('[data-testid]', els => els.map(e => e.getAttribute('data-testid')))
  console.log('testids found:', testids)

  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 300))
  console.log('Body text:', bodyText)
})
