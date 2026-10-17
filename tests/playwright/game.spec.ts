import type { Locator, Page } from '@playwright/test'

import type { Move } from './helpers/game-board'

import { expect, test } from '@playwright/test'

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

const getNewTile = async (page: Page, existingIds: Set<string>): Promise<Locator> => {
  await waitForNewTiles(page, existingIds)

  const tileId = await page.locator('.b-game-ground__tile').evaluateAll((tiles, ids) => (
    tiles.map(tile => tile.getAttribute('data-tile-id')).find(id => id !== null && !ids.includes(id))
  ), [...existingIds])

  if (tileId === undefined) {
    throw new Error('A refilled tile should appear after the move')
  }

  return page.locator(`.b-game-ground__tile[data-tile-id="${tileId}"]`)
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

test('first level keeps a 7 by 5 grid readable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedMathRandom(page)
  await page.goto('/game/1')

  const cells = page.locator('.b-game-ground__cell')
  const guides = page.locator('.b-game-board-shell__guide--gravity')

  await expect(cells).toHaveCount(7 * 5)
  await expect(guides).toHaveCount(7)

  const metrics = await page.locator('.b-game-ground').evaluate((ground) => {
    const grid = ground.querySelector<HTMLElement>('.b-game-ground__cells')!
    const cell = ground.querySelector<HTMLElement>('.b-game-ground__cell')!
    const board = ground.parentElement!
    const gridStyle = getComputedStyle(grid)
    const groundRect = ground.getBoundingClientRect()
    const boardRect = board.getBoundingClientRect()
    const cellRect = cell.getBoundingClientRect()

    return {
      columns: gridStyle.gridTemplateColumns.split(' ').length,
      rows: gridStyle.gridTemplateRows.split(' ').length,
      fitsWidth: groundRect.width <= boardRect.width + 1,
      fitsHeight: groundRect.height <= boardRect.height + 1,
      cellSize: Math.min(cellRect.width, cellRect.height),
    }
  })

  expect(metrics).toMatchObject({
    columns: 7,
    rows: 5,
    fitsWidth: true,
    fitsHeight: true,
  })
  expect(metrics.cellSize).toBeGreaterThanOrEqual(28)

  const groundBox = await page.locator('.b-game-ground').boundingBox()
  const guideBoxes = await guides.evaluateAll(elements => (
    elements.map(element => element.getBoundingClientRect().toJSON())
  ))

  expect(groundBox).not.toBeNull()
  guideBoxes.forEach(box => expect(box.y).toBeGreaterThan(groundBox!.y + groundBox!.height))
})

test('valid moves keep animated tiles inside the board', async ({ page }, testInfo) => {
  await seedMathRandom(page)
  await page.goto('/game/1')
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
  await page.goto('/game/1')
  await expect(page.locator('.b-game-ground')).toBeVisible()

  const move = findVerticalValidMove(await getTiles(page))

  await clickTile(page, move.from)
  await clickTile(page, move.to)
  await page.waitForTimeout(80)
  await expectSwapAnimationStarted(page, move)
})

test('refilled tiles compress shortly before landing and restore their shape', async ({ page }, testInfo) => {
  await seedMathRandom(page)
  await page.goto('/game/1')

  const initialTileIds = new Set((await getTiles(page)).map(tile => tile.id))

  await makeValidMove(page)

  const tile = await getNewTile(page, initialTileIds)
  const motion = await tile.evaluate(async (element) => {
    const animation = element.ownerDocument.getAnimations().find(candidate => (
      candidate instanceof CSSAnimation
        && candidate.animationName === 'b-game-tile-landing'
        && candidate.effect instanceof KeyframeEffect
        && candidate.effect.target === element
        && candidate.effect.pseudoElement === '::before'
    ))

    if (animation === undefined) {
      throw new Error('Refilled tile should have a landing animation')
    }

    const duration = Number(animation.effect?.getTiming().duration)
    const measureScale = () => {
      const transform = getComputedStyle(element, '::before').transform
      const matrix = transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(transform)

      return {
        x: Math.hypot(matrix.a, matrix.b),
        y: Math.hypot(matrix.c, matrix.d),
      }
    }
    const seek = async (time: number) => {
      animation.currentTime = time
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

      return measureScale()
    }

    animation.pause()

    const resting = await seek(0)
    const compressed = await seek(duration * 0.86)

    return { resting, compressed }
  })

  await testInfo.attach('tile-before-landing', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  const landed = await tile.evaluate(async (element) => {
    const animation = element.ownerDocument.getAnimations().find(candidate => (
      candidate instanceof CSSAnimation
        && candidate.animationName === 'b-game-tile-landing'
        && candidate.effect instanceof KeyframeEffect
        && candidate.effect.target === element
        && candidate.effect.pseudoElement === '::before'
    ))

    if (animation === undefined) {
      throw new Error('Landing animation should remain active until the tile settles')
    }

    animation.currentTime = Number(animation.effect?.getTiming().duration)
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

    const transform = getComputedStyle(element, '::before').transform
    const matrix = transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(transform)

    return Math.hypot(matrix.c, matrix.d)
  })

  expect(motion.resting.y).toBeCloseTo(1, 2)
  expect(motion.compressed.y).toBeLessThan(motion.resting.y)
  expect(motion.compressed.x).toBeGreaterThan(motion.resting.x)
  expect(landed).toBeCloseTo(1, 2)
  await expect(page.locator('.b-game-tile--landing')).toHaveCount(0)
})

test('directional mouse drag performs a valid ordinary move', async ({ page }) => {
  await seedMathRandom(page)
  await page.goto('/game/1')
  await expect(page.locator('.b-game-ground')).toBeVisible()

  const move = findValidMove(await getTiles(page))

  await dragTileToward(page, move.from, move.to)

  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24', { timeout: 10_000 })
  await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)
})
