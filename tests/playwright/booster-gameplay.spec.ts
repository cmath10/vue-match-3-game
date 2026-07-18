import type { Locator, Page } from '@playwright/test'

import type { TileSnapshot } from './helpers/game-board'

import { expect, test } from '@playwright/test'

import { BOOSTER_TYPE, TILE_TYPE } from '@/enums/game'

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  clickTile,
  dragTileToward,
  findBoosterMove,
  getTiles,
  makeMove,
  seedMathRandom,
  swipeTile,
} from './helpers/game-board'

type BoosterScenario = {
  type: BOOSTER_TYPE
  seed: number
}

const boosterScenarios: BoosterScenario[] = [
  { type: BOOSTER_TYPE.BUTTON_BOX, seed: 4 },
  { type: BOOSTER_TYPE.COLUMN_FIRECRACKER, seed: 5 },
  { type: BOOSTER_TYPE.ROW_FIRECRACKER, seed: 2 },
  { type: BOOSTER_TYPE.AREA_KETTLE, seed: 8 },
]
const buttonBoxScenario = boosterScenarios[0]
const geometricBoosterScenarios = boosterScenarios.filter(scenario => scenario.type !== BOOSTER_TYPE.BUTTON_BOX)

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
    } else {
      await expect(page.locator(`.b-game-booster-effect--${scenario.type}`)).toBeVisible()
    }

    await expect(page.locator('.b-game-menu__turns-value')).toHaveText('23', { timeout: 10_000 })
    await expect(page.locator(`.b-game-ground__tile[data-tile-id="${boosterId}"]`)).toHaveCount(0)
    await expect(page.locator('.b-game-button')).toHaveCount(0)
    await expect(page.locator('.b-game-booster-effect')).toHaveCount(0)
    await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)
  })
}

for (const scenario of boosterScenarios.filter(({ type }) => (
  type === BOOSTER_TYPE.ROW_FIRECRACKER || type === BOOSTER_TYPE.COLUMN_FIRECRACKER
))) {
  test(`${scenario.type} animation starts at the activated tile`, async ({ page }) => {
    const booster = await startBoosterScenario(page, scenario)
    const boosterBox = await booster.boundingBox()

    expect(boosterBox).not.toBeNull()

    await booster.dblclick()

    const effect = page.locator(`.b-game-booster-effect--${scenario.type}`)

    await expect(effect).toBeVisible()

    const origin = await effect.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const [x, y] = getComputedStyle(element, '::before')
        .transformOrigin
        .split(' ')
        .map(Number.parseFloat)

      return {
        x: rect.x + x,
        y: rect.y + y,
      }
    })

    const expected = {
      x: boosterBox!.x + boosterBox!.width / 2,
      y: boosterBox!.y + boosterBox!.height / 2,
    }

    if (scenario.type === BOOSTER_TYPE.ROW_FIRECRACKER) {
      expect(origin.x).toBeCloseTo(expected.x, 0)
    } else {
      expect(origin.y).toBeCloseTo(expected.y, 0)
    }
  })
}

for (const scenario of geometricBoosterScenarios) {
  test(`${scenario.type} activates when an ordinary tile is swiped into it`, async ({ page }) => {
    const booster = await startBoosterScenario(page, scenario)
    const tiles = await getTiles(page)
    const boosterId = await booster.getAttribute('data-tile-id')
    const boosterSnapshot = tiles.find(tile => tile.id === boosterId)

    expect(boosterSnapshot).toBeDefined()

    const target = findOrdinaryNeighbor(tiles, boosterSnapshot!)

    expect(target).not.toBeNull()

    await swipeTile(page, target!, boosterSnapshot!)

    await expect(page.locator(`.b-game-booster-effect--${scenario.type}`)).toBeVisible()
    await expect(page.locator('.b-game-menu__turns-value')).toHaveText('23', { timeout: 10_000 })
    await expect(booster).toHaveCount(0)
    await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)
  })
}

test('adjacent click fallback activates a firecracker instead of reverting its swap', async ({ page }) => {
  const scenario = geometricBoosterScenarios.find(item => item.type === BOOSTER_TYPE.ROW_FIRECRACKER)!
  const booster = await startBoosterScenario(page, scenario)
  const tiles = await getTiles(page)
  const boosterId = await booster.getAttribute('data-tile-id')
  const boosterSnapshot = tiles.find(tile => tile.id === boosterId)

  expect(boosterSnapshot).toBeDefined()

  const target = findOrdinaryNeighbor(tiles, boosterSnapshot!)

  expect(target).not.toBeNull()

  await clickTile(page, target!)
  await booster.click()

  await expect(page.locator(`.b-game-booster-effect--${scenario.type}`)).toBeVisible()
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('23', { timeout: 10_000 })
  await expect(booster).toHaveCount(0)
})

test('directional mouse drag activates a firecracker before reaching the target tile', async ({ page }) => {
  const scenario = geometricBoosterScenarios.find(item => item.type === BOOSTER_TYPE.ROW_FIRECRACKER)!
  const booster = await startBoosterScenario(page, scenario)
  const tiles = await getTiles(page)
  const boosterId = await booster.getAttribute('data-tile-id')
  const boosterSnapshot = tiles.find(tile => tile.id === boosterId)

  expect(boosterSnapshot).toBeDefined()

  const target = findOrdinaryNeighbor(tiles, boosterSnapshot!)

  expect(target).not.toBeNull()

  await dragTileToward(page, boosterSnapshot!, target!)

  await expect(page.locator(`.b-game-booster-effect--${scenario.type}`)).toBeVisible()
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('23', { timeout: 10_000 })
  await expect(booster).toHaveCount(0)
})

for (const direction of ['booster-to-tile', 'tile-to-booster'] as const) {
  test(`button box collects the selected ordinary type on ${direction} swipe`, async ({ page }) => {
    const booster = await startBoosterScenario(page, buttonBoxScenario)
    const tiles = await getTiles(page)
    const boosterId = await booster.getAttribute('data-tile-id')
    const boosterSnapshot = tiles.find(tile => tile.id === boosterId)

    expect(boosterSnapshot).toBeDefined()

    const target = findOrdinaryNeighbor(tiles, boosterSnapshot!)

    expect(target).not.toBeNull()

    const [from, to] = direction === 'booster-to-tile'
      ? [boosterSnapshot!, target!]
      : [target!, boosterSnapshot!]

    await swipeTile(page, from, to)

    await expect(page.locator(`.b-game-button--${target!.type}`).first()).toBeVisible()
    await expect(page.locator('.b-game-menu__turns-value')).toHaveText('23', { timeout: 10_000 })
    await expect(booster).toHaveCount(0)
  })
}

test('button box swipe tolerates release in the target cell outside the tile image', async ({ page }) => {
  const booster = await startBoosterScenario(page, buttonBoxScenario)
  const tiles = await getTiles(page)
  const boosterId = await booster.getAttribute('data-tile-id')
  const boosterSnapshot = tiles.find(tile => tile.id === boosterId)

  expect(boosterSnapshot).toBeDefined()

  const target = findOrdinaryNeighbor(tiles, boosterSnapshot!)

  expect(target).not.toBeNull()

  await swipePastTargetEdge(page, boosterSnapshot!, target!)

  await expect(page.locator(`.b-game-button--${target!.type}`).first()).toBeVisible()
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('23', { timeout: 10_000 })
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

test('starting a new game cancels a geometric booster effect', async ({ page }) => {
  const kettleScenario = boosterScenarios[3]
  const booster = await startBoosterScenario(page, kettleScenario)

  await booster.dblclick()
  await expect(page.locator(`.b-game-booster-effect--${BOOSTER_TYPE.AREA_KETTLE}`)).toBeVisible()
  await page.getByRole('button', { name: 'New game' }).click()

  await expect(page.locator('.b-game-booster-effect')).toHaveCount(0)
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('25')

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

const swipePastTargetEdge = async (
  page: Page,
  source: TileSnapshot,
  target: TileSnapshot
): Promise<void> => {
  const sourceX = source.x + source.width / 2
  const sourceY = source.y + source.height / 2
  const targetX = target.x + target.width / 2
  const targetY = target.y + target.height / 2
  const horizontalDirection = Math.sign(targetX - sourceX)
  const verticalDirection = Math.sign(targetY - sourceY)

  await page.mouse.move(sourceX, sourceY)
  await page.mouse.down()
  await page.mouse.move(
    targetX + horizontalDirection * (target.width / 2 + 2),
    targetY + verticalDirection * (target.height / 2 + 2)
  )
  await page.mouse.up()
}
