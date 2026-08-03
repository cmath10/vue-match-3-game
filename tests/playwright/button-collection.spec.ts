import type { BoosterWave, Tile } from '@/domain/types'

import { expect, test } from '@playwright/test'

import { getButtonFlights } from '@/composables/useButtonCollection'
import TileGrid from '@/game/board/TileGrid'

import { BoosterType, SpecialTileType, TileType } from '@/domain/enums'

const createTile = (id: number, type: Tile['type'], row: number, column: number): Tile => ({
  id,
  type,
  selected: false,
  row,
  column,
})

test('button flights include only ordinary tiles actually collected by the box', () => {
  const grid = new TileGrid(4, 2)
  const box = createTile(1, BoosterType.ButtonBox, 0, 0)
  const collectable = createTile(2, TileType.SweetsFish, 0, 1)
  const packaged = createTile(3, TileType.SweetsFish, 0, 2)
  const cookie = createTile(4, SpecialTileType.Cookie, 0, 3)
  const wave: BoosterWave = {
    effects: [{
      source: { row: 0, column: 0 },
      positions: [
        { row: 0, column: 0 },
        { row: 0, column: 1 },
        { row: 0, column: 2 },
      ],
      booster: BoosterType.ButtonBox,
      targetType: TileType.SweetsFish,
    }],
    positions: [
      { row: 0, column: 0 },
      { row: 0, column: 1 },
      { row: 0, column: 2 },
    ],
  }

  packaged.blocker = { type: SpecialTileType.Package, health: 1 }
  cookie.health = 3
  grid.setTile(box, 0, 0)
  grid.setTile(collectable, 0, 1)
  grid.setTile(packaged, 0, 2)
  grid.setTile(cookie, 0, 3)

  expect(getButtonFlights(grid, wave)).toEqual([{
    id: '0-0-2',
    tileId: 2,
    type: TileType.SweetsFish,
    from: { row: 0, column: 1 },
    to: { row: 0, column: 0 },
    active: false,
  }])
})

test('each ordinary tile type has its corresponding button asset', async ({ page }) => {
  await page.goto('/game/1')

  const buttonAssets = [
    [TileType.SweetsBarbaris, 'tile-button-barbaris'],
    [TileType.SweetsFish, 'tile-button-fish'],
    [TileType.SweetsRooster, 'tile-button-rooster'],
    [TileType.SweetsPillow, 'tile-button-pillow'],
    [TileType.SweetsBird, 'tile-button-bird'],
  ] as const

  await page.evaluate((types) => {
    types.forEach((type) => {
      const button = document.createElement('div')

      button.dataset.buttonType = type
      button.classList.add('b-game-button', `b-game-button--${type}`)
      document.body.append(button)
    })
  }, buttonAssets.map(([type]) => type))

  for (const [type, asset] of buttonAssets) {
    await expect(page.locator(`[data-button-type="${type}"]`))
      .toHaveCSS('background-image', new RegExp(`${asset}\\.`))
  }
})
