import { expect, test } from '@playwright/test'

import { BoosterType } from '@/domain/enums'
import { createPlayerState } from '@/domain/progress'

import { seedMathRandom } from './helpers/game-board'
import { seedPlayerState } from './helpers/player-state'

const openLevel = async (page: import('@playwright/test').Page, levelId: number): Promise<void> => {
  await seedMathRandom(page)
  const state = createPlayerState()

  state.highestUnlockedLevel = levelId
  await seedPlayerState(page, state)
  await page.goto(`/game/${levelId}`)
}

test('stable levels render only their authored special tile mechanics', async ({ page }) => {
  await openLevel(page, 1)

  await expect(page.locator('.b-game-ground__tile.b-game-tile--special-mug')).toHaveCount(0)
  await expect(page.locator('.b-game-ground__tile.b-game-tile--special-cookie')).toHaveCount(0)
  await expect(page.locator('.b-game-ground__tile.b-game-tile--blocker-special-package')).toHaveCount(0)

  await openLevel(page, 15)

  await expect(page.locator('.b-game-ground__tile.b-game-tile--special-mug')).toHaveCount(3)
  await expect(page.locator('.b-game-ground__tile.b-game-tile--special-cookie')).toHaveCount(4)
  await expect(page.locator('.b-game-ground__tile.b-game-tile--blocker-special-package')).toHaveCount(4)
  await expect(page.locator('.b-game-ground__tile.b-game-tile--cookie-jam-2')).toHaveCount(4)
  await expect(page.locator('.b-game-menu__objective')).toHaveCount(4)
})

test('standalone package blockers cover the whole cell and cannot be selected', async ({ page }) => {
  await openLevel(page, 2)

  const packagedTile = page.locator('.b-game-ground__tile.b-game-tile--blocker-special-package').first()
  const cell = page.locator('.b-game-ground__cell').first()
  const cellBox = await cell.boundingBox()
  const packageOverlaySize = await packagedTile.evaluate((element) => {
    const styles = getComputedStyle(element, '::after')

    return {
      width: Number.parseFloat(styles.width),
      height: Number.parseFloat(styles.height),
    }
  })

  if (cellBox === null) {
    throw new Error('Expected a visible game cell')
  }

  expect(packageOverlaySize.width).toBeCloseTo(cellBox.width, 0)
  expect(packageOverlaySize.height).toBeCloseTo(cellBox.height, 0)

  await packagedTile.click()

  await expect(packagedTile).not.toHaveClass(/b-game-ground__tile--selected/)
})

test('mugs use highlighted assets when selected for a swap', async ({ page }) => {
  await openLevel(page, 6)

  const mugTile = page.locator('.b-game-ground__tile.b-game-tile--special-mug').first()

  await mugTile.click()

  await expect(mugTile).toHaveClass(/b-game-ground__tile--selected/)
  await expect(mugTile).toHaveCSS('background-image', /tile-special-mug-selected/)
})

test('cookies use highlighted assets when selected for a swap', async ({ page }) => {
  await openLevel(page, 7)

  const cookieTile = page.locator(
    '.b-game-ground__tile.b-game-tile--special-cookie.b-game-tile--cookie-jam-2'
  ).first()

  await cookieTile.click()

  await expect(cookieTile).toHaveClass(/b-game-ground__tile--selected/)
  await expect(cookieTile).toHaveCSS('background-image', /tile-special-cookie-selected/)
  await expect.poll(() => cookieTile.evaluate(element => (
    getComputedStyle(element, '::after').backgroundImage
  ))).toContain('tile-cookie-jam-2-selected')
})

test('boosters have regular and highlighted game assets', async ({ page }) => {
  await page.goto('/game/1')

  const boosterTypes = Object.values(BoosterType)

  await page.evaluate((types) => {
    for (const type of types) {
      const tile = document.createElement('div')

      tile.dataset.boosterType = type
      tile.classList.add('b-game-tile', `b-game-tile--${type}`)
      document.body.append(tile)
    }
  }, boosterTypes)

  for (const type of boosterTypes) {
    const tile = page.locator(`[data-booster-type="${type}"]`)

    await expect(tile).toHaveCSS('background-image', new RegExp(`tile-${type}\\.png`))

    await tile.evaluate(element => element.classList.add('b-game-ground__tile--selected'))

    await expect(tile).toHaveCSS('background-image', new RegExp(`tile-${type}-selected\\.png`))
  }
})
