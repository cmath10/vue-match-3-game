import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import { BOOSTER_TYPE, TILE_TYPE } from '../../src/enums/game'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  findBoosterMove,
  getTiles,
  makeMove,
  seedMathRandom,
  swipeTile,
  type TileSnapshot,
} from './helpers/game-board'

type BoosterScenario = {
  type: BOOSTER_TYPE
  seed: number
}

const boosterScenarios: BoosterScenario[] = [
  { type: BOOSTER_TYPE.BUTTON_BOX, seed: 3 },
  { type: BOOSTER_TYPE.COLUMN_FIRECRACKER, seed: 4 },
  { type: BOOSTER_TYPE.ROW_FIRECRACKER, seed: 9 },
  { type: BOOSTER_TYPE.AREA_KETTLE, seed: 19 },
]
const buttonBoxScenario = boosterScenarios[0]
const rowFirecrackerScenario = boosterScenarios[2]

const startBoosterScenario = async (
  page: Page,
  scenario: BoosterScenario
): Promise<Locator> => {
  await seedMathRandom(page, scenario.seed)
  await page.goto('/')
  await expect(page.locator('.b-game-ground')).toBeVisible()

  const move = findBoosterMove(await getTiles(page), scenario.type)

  if (move === null) {
    throw new Error(`Seed ${scenario.seed} should create ${scenario.type}`)
  }

  await makeMove(page, move)
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24', { timeout: 10_000 })

  const booster = page.locator(`.b-game-ground__tile[data-tile-id="${move.from.id}"]`)

  await expect(booster).toHaveClass(new RegExp(`b-game-tile--${scenario.type}`))
  await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)

  return booster
}

for (const scenario of boosterScenarios) {
  test(`${scenario.type} is created by a real board move and activates on double click`, async ({ page }) => {
    const booster = await startBoosterScenario(page, scenario)
    const boosterId = await booster.getAttribute('data-tile-id')

    await booster.dblclick()

    if (scenario.type === BOOSTER_TYPE.BUTTON_BOX) {
      await expect(page.locator('.b-game-button').first()).toBeVisible()
    }

    await expect(page.locator('.b-game-menu__turns-value')).toHaveText('23', { timeout: 10_000 })
    await expect(page.locator(`.b-game-ground__tile[data-tile-id="${boosterId}"]`)).toHaveCount(0)
    await expect(page.locator('.b-game-button')).toHaveCount(0)
    await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)
  })
}

test('a created booster swaps with an ordinary tile and activates on swipe', async ({ page }) => {
  const booster = await startBoosterScenario(page, rowFirecrackerScenario)
  const tiles = await getTiles(page)
  const boosterId = await booster.getAttribute('data-tile-id')
  const boosterSnapshot = tiles.find(tile => tile.id === boosterId)

  expect(boosterSnapshot).toBeDefined()

  const target = findOrdinaryNeighbor(tiles, boosterSnapshot!)

  expect(target).not.toBeNull()

  await swipeTile(page, boosterSnapshot!, target!)

  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('23', { timeout: 10_000 })
  await expect(booster).toHaveCount(0)
  await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)
})

test('starting a new game cancels button flights and the obsolete booster turn', async ({ page }) => {
  const booster = await startBoosterScenario(page, buttonBoxScenario)

  await booster.dblclick()
  await expect(page.locator('.b-game-button').first()).toBeVisible()
  await page.getByRole('button', { name: 'New game' }).click()

  await expect(page.locator('.b-game-button')).toHaveCount(0)
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('25')
  await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)

  await page.waitForTimeout(600)
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('25')
  await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)
})

const findOrdinaryNeighbor = (
  tiles: TileSnapshot[],
  source: TileSnapshot
): TileSnapshot | null => {
  const ordinaryTypes = new Set<string>(Object.values(TILE_TYPE))

  return tiles.find(tile => (
    !tile.blocked &&
    ordinaryTypes.has(tile.type) &&
    (
      (tile.row === source.row && Math.abs(tile.column - source.column) === 1) ||
      (tile.column === source.column && Math.abs(tile.row - source.row) === 1)
    )
  )) ?? null
}
