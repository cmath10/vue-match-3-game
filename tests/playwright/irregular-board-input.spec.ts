import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'

import { createPlayerState } from '@/domain/progress'

import { clickTile, getTiles, seedMathRandom } from './helpers/game-board'
import { seedPlayerState } from './helpers/player-state'
import { swipeTile } from './helpers/game-board'

const openLevelEleven = async (page: Page): Promise<void> => {
  const state = createPlayerState()

  state.highestUnlockedLevel = 11
  await seedMathRandom(page, 11)
  await seedPlayerState(page, state)
  await page.goto('/game/11')
  await expect(page.locator('.b-game-ground')).toBeVisible()
}

const getTileTransforms = (page: Page) => page.locator('.b-game-ground__tile').evaluateAll(elements => (
  Object.fromEntries(elements.map(element => [
    element.getAttribute('data-tile-id'), (element as HTMLElement).style.transform,
  ]))
))

test('a click below missing cells selects its own tile without swapping a neighbor', async ({ page }) => {
  await openLevelEleven(page)
  const tiles = await getTiles(page)
  const source = tiles.find(tile => tile.row === 5 && tile.column === 3)!
  const before = await getTileTransforms(page)

  await clickTile(page, source)

  await expect(page.locator('.b-game-ground__tile--selected')).toHaveAttribute('data-tile-id', source.id)
  expect(await getTileTransforms(page)).toEqual(before)
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('25')
})

for (const gesture of ['click', 'swipe']) {
  test(`level 11 swaps the chosen tiles across bottom rows by ${gesture}`, async ({ page }) => {
    await openLevelEleven(page)
    const tiles = await getTiles(page)
    const source = tiles.find(tile => tile.row === 6 && tile.column === 3)!
    const target = tiles.find(tile => tile.row === 5 && tile.column === 3)!
    const before = await getTileTransforms(page)

    if (gesture === 'click') {
      await clickTile(page, source)
      await clickTile(page, target)
    } else {
      await swipeTile(page, source, target)
    }
    const expected = { ...before, [source.id]: before[target.id], [target.id]: before[source.id] }

    expect(await getTileTransforms(page)).toEqual(expected)
  })
}
