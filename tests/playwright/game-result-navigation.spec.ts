import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'

import { createPlayerState, LEVEL_COUNT } from '@/domain/progress'

import { completeStoredObjectives } from './helpers/player-state'
import { findValidMove } from './helpers/game-board'
import { getStoredTurns } from './helpers/player-state'
import { getTiles, makeMove, seedMathRandom } from './helpers/game-board'
import { seedPlayerState } from './helpers/player-state'

const completeLevel = async (page: Page, levelId: number): Promise<void> => {
  const state = createPlayerState()

  state.highestUnlockedLevel = levelId
  await seedMathRandom(page, levelId)
  await seedPlayerState(page, state)
  await page.goto(`/game/${levelId}`)
  await expect(page.locator('.b-game-ground')).toBeVisible()
  await expect.poll(() => getStoredTurns(page, levelId)).toBe(25)
  await completeStoredObjectives(page, levelId)
  await page.goto(`/game/${levelId}?resume=1`)
  await makeMove(page, findValidMove(await getTiles(page)))
  await expect(page.getByText('You win!')).toBeVisible({ timeout: 10_000 })
}

test('a completed level offers a filled action that opens the next level', async ({ page }, testInfo) => {
  await completeLevel(page, 1)

  const fieldBox = await page.locator('.b-game-layout__field').boundingBox()
  const menuBox = await page.locator('.b-game-layout__menu').boundingBox()
  const overlayBox = await page.locator('.b-game-layout__result').boundingBox()
  const playAgain = page.getByRole('button', { name: 'Play again' })
  const nextLevel = page.getByRole('button', { name: 'Next level' })

  expect(fieldBox).not.toBeNull()
  expect(menuBox).not.toBeNull()
  expect(overlayBox).not.toBeNull()

  if (fieldBox === null || menuBox === null || overlayBox === null) {
    throw new Error('Expected the game field, menu, and result overlay to have layout boxes')
  }

  expect(overlayBox.x).toBeCloseTo(fieldBox.x)
  expect(overlayBox.y).toBeCloseTo(fieldBox.y)
  expect(overlayBox.width).toBeCloseTo(fieldBox.width)
  expect(overlayBox.height).toBeCloseTo(fieldBox.height)
  expect(overlayBox.x).toBeGreaterThanOrEqual(menuBox.x + menuBox.width - 1)
  await expect(playAgain).toHaveClass(/btn-outline-light/)
  await expect(nextLevel).toHaveClass(/btn-light/)
  await expect(nextLevel).not.toHaveClass(/btn-outline-light/)
  await testInfo.attach('completed-level-actions', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await nextLevel.click()

  await expect(page).toHaveURL(/\/game\/2$/)
  await expect(page.getByText('Level 2', { exact: true })).toBeVisible()
})

test('the final completed level does not offer a next level action', async ({ page }) => {
  await completeLevel(page, LEVEL_COUNT)

  await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next level' })).toHaveCount(0)
})
