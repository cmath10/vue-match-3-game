import type { BoosterWave } from '@/entities/Match3BoosterWave'

import type { Tile } from '@/types/game'

import { expect, test } from '@playwright/test'

import { getButtonFlights } from '@/composables/useMatch3ButtonCollection'
import TileGrid from '@/entities/TileGrid'

import { BOOSTER_TYPE, SPECIAL_TILE_TYPE, TILE_TYPE } from '@/enums/game'

const createTile = (id: number, type: Tile['type'], row: number, column: number): Tile => ({
  id,
  type,
  selected: false,
  row,
  column,
})

test('button flights include only ordinary tiles actually collected by the box', () => {
  const grid = new TileGrid(4, 2)
  const box = createTile(1, BOOSTER_TYPE.BUTTON_BOX, 0, 0)
  const collectable = createTile(2, TILE_TYPE.SWEETS_FISH, 0, 1)
  const packaged = createTile(3, TILE_TYPE.SWEETS_FISH, 0, 2)
  const cookie = createTile(4, SPECIAL_TILE_TYPE.COOKIE, 0, 3)
  const wave: BoosterWave = {
    effects: [{
      source: { row: 0, column: 0 },
      positions: [
        { row: 0, column: 0 },
        { row: 0, column: 1 },
        { row: 0, column: 2 },
      ],
      booster: BOOSTER_TYPE.BUTTON_BOX,
      targetType: TILE_TYPE.SWEETS_FISH,
    }],
    positions: [
      { row: 0, column: 0 },
      { row: 0, column: 1 },
      { row: 0, column: 2 },
    ],
  }

  packaged.blocker = { type: SPECIAL_TILE_TYPE.PACKAGE, health: 1 }
  cookie.health = 3
  grid.setTile(box, 0, 0)
  grid.setTile(collectable, 0, 1)
  grid.setTile(packaged, 0, 2)
  grid.setTile(cookie, 0, 3)

  expect(getButtonFlights(grid, wave)).toEqual([{
    id: '0-0-2',
    tileId: 2,
    type: TILE_TYPE.SWEETS_FISH,
    from: { row: 0, column: 1 },
    to: { row: 0, column: 0 },
    active: false,
  }])
})

test('each ordinary tile type has its corresponding button asset', async ({ page }) => {
  await page.goto('/')

  const buttonAssets = [
    [TILE_TYPE.SWEETS_BARBARIS, 'tile-button-barbaris'],
    [TILE_TYPE.SWEETS_FISH, 'tile-button-fish'],
    [TILE_TYPE.SWEETS_ROOSTER, 'tile-button-rooster'],
    [TILE_TYPE.SWEETS_PILLOW, 'tile-button-pillow'],
    [TILE_TYPE.SWEETS_BIRD, 'tile-button-bird'],
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
