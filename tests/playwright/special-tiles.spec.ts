import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const seedMathRandom = async (page: Page) => {
  await page.addInitScript(() => {
    let seed = 42

    Math.random = () => {
      seed = (seed * 16807) % 2147483647

      return (seed - 1) / 2147483646
    }
  })
}

test('new game renders special tile mechanics', async ({ page }) => {
  await seedMathRandom(page)
  await page.goto('/')

  await expect(page.locator('.b-game-ground__tile.b-game-tile--special-mug')).toHaveCount(3)
  await expect(page.locator('.b-game-ground__tile.b-game-tile--special-cookie')).toHaveCount(4)
  await expect(page.locator('.b-game-ground__tile.b-game-tile--blocker-special-package')).toHaveCount(6)
  await expect(page.locator('.b-game-ground__tile.b-game-tile--cookie-jam-2')).toHaveCount(4)
  await expect(page.locator(
    '.b-game-menu__objective .b-game-tile--special-mug,' +
    '.b-game-menu__objective .b-game-tile--special-package,' +
    '.b-game-menu__objective .b-game-tile--special-cookie'
  )).toHaveCount(1)
})

test('packaged tiles cannot be selected for a swap', async ({ page }) => {
  await seedMathRandom(page)
  await page.goto('/')

  const packagedTile = page.locator('.b-game-ground__tile.b-game-tile--blocker-special-package').first()

  await packagedTile.click()

  await expect(packagedTile).not.toHaveClass(/b-game-ground__tile--selected/)
})

test('cookies can be selected for a swap', async ({ page }) => {
  await seedMathRandom(page)
  await page.goto('/')

  const cookieTile = page.locator('.b-game-ground__tile.b-game-tile--special-cookie').first()

  await cookieTile.click()

  await expect(cookieTile).toHaveClass(/b-game-ground__tile--selected/)
})
