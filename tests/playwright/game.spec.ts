import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  clickTile,
  dragTileToward,
  findValidMove,
  findVerticalValidMove,
  getObjectiveTypes,
  getTiles,
  makeMove,
  seedMathRandom,
  type Move,
} from './helpers/game-board'

const expectTilesInsideGround = async (page: Page) => {
  const ground = await page.locator('.b-game-ground').boundingBox()
  const tiles = await page.locator('.b-game-ground__tile').all()

  expect(ground).not.toBeNull()

  for (const tile of tiles) {
    const box = await tile.boundingBox()

    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(ground!.x)
    expect(box!.y).toBeGreaterThanOrEqual(ground!.y)
    expect(box!.x + box!.width).toBeLessThanOrEqual(ground!.x + ground!.width)
    expect(box!.y + box!.height).toBeLessThanOrEqual(ground!.y + ground!.height)
  }
}

const makeValidMove = async (page: Page): Promise<Move> => {
  const move = findValidMove(await getTiles(page))

  await makeMove(page, move)

  return move
}

const waitForNewTiles = async (page: Page, existingIds: Set<string>) => {
  await page.waitForFunction((ids) => {
    return [...document.querySelectorAll('.b-game-ground__tile')]
      .some(element => !ids.includes(element.getAttribute('data-tile-id') || ''))
  }, [...existingIds])
}

const expectSwapAnimationStarted = async (page: Page, move: Move) => {
  const tiles = await getTiles(page)
  const movedTile = tiles.find(tile => tile.id === move.from.id)

  expect(movedTile).toBeDefined()

  const startDistance = Math.hypot(move.from.x - move.to.x, move.from.y - move.to.y)
  const currentDistance = Math.hypot(movedTile!.x - move.to.x, movedTile!.y - move.to.y)

  expect(currentDistance).toBeLessThan(startDistance)
  expect(currentDistance).toBeGreaterThan(1)
}

test('valid moves keep animated tiles inside the board', async ({ page }, testInfo) => {
  await seedMathRandom(page)
  await page.goto('/')
  await expect(page.locator('.b-game-ground')).toBeVisible()

  const objectiveTypes = await getObjectiveTypes(page)

  expect(new Set(objectiveTypes).size).toBe(objectiveTypes.length)
  await testInfo.attach('initial-board', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  const initialTileIds = new Set((await getTiles(page)).map(tile => tile.id))

  const firstMove = await makeValidMove(page)
  await page.waitForTimeout(80)
  await expectSwapAnimationStarted(page, firstMove)
  await testInfo.attach('during-swap', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await waitForNewTiles(page, initialTileIds)

  const ground = await page.locator('.b-game-ground').boundingBox()
  const enteringTiles = (await getTiles(page)).filter(tile => !initialTileIds.has(tile.id))

  expect(ground).not.toBeNull()
  expect(enteringTiles.length).toBeGreaterThan(0)
  expect(enteringTiles.some(tile => tile.y < ground!.y)).toBe(true)

  await page.waitForTimeout(80)
  await testInfo.attach('during-valid-move', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await page.waitForTimeout(720)
  await testInfo.attach('after-first-valid-move', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24')
  await expectTilesInsideGround(page)
  await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)

  await page.getByRole('button', { name: 'New game' }).click()
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('25')
  await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)

  const newGameObjectiveTypes = await getObjectiveTypes(page)

  expect(new Set(newGameObjectiveTypes).size).toBe(newGameObjectiveTypes.length)

  await makeValidMove(page)
  await page.waitForTimeout(800)
  await expectTilesInsideGround(page)
  await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)
})

test('vertical valid moves animate before settling', async ({ page }) => {
  await seedMathRandom(page)
  await page.goto('/')
  await expect(page.locator('.b-game-ground')).toBeVisible()

  const move = findVerticalValidMove(await getTiles(page))

  await clickTile(page, move.from)
  await clickTile(page, move.to)
  await page.waitForTimeout(80)
  await expectSwapAnimationStarted(page, move)
})

test('directional mouse drag performs a valid ordinary move', async ({ page }) => {
  await seedMathRandom(page)
  await page.goto('/')
  await expect(page.locator('.b-game-ground')).toBeVisible()

  const move = findValidMove(await getTiles(page))

  await dragTileToward(page, move.from, move.to)

  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24', { timeout: 10_000 })
  await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)
})
