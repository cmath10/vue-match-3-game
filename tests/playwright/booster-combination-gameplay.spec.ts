import type { Page } from '@playwright/test'

import type { GameSnapshot } from '@/domain/progress'
import type { Tile } from '@/domain/types'

import { expect, test } from '@playwright/test'

import { BoosterCombinationType, BoosterType } from '@/domain/enums'
import { createPlayerState, createSessionStatistics } from '@/domain/progress'
import { SpecialTileType } from '@/domain/enums'

import {
  AVAILABLE_TILE_TYPES,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  COUNTER_TYPES,
} from '@/domain/config'

import { getTiles } from './helpers/game-board'
import { seedPlayerState } from './helpers/player-state'
import { swipeTile } from './helpers/game-board'

type CombinationScenario = {
  name: string
  source: BoosterType
  target: BoosterType
  combination: BoosterCombinationType
  asset: string
  rowEffects: number
  columnEffects: number
}

const SOURCE = { row: 4, column: 4 }
const TARGET = { row: 4, column: 5 }
const TILE_COUNT = BOARD_WIDTH * BOARD_HEIGHT
const scenarios: CombinationScenario[] = [
  {
    name: 'two row firecrackers',
    source: BoosterType.RowFirecracker,
    target: BoosterType.RowFirecracker,
    combination: BoosterCombinationType.RowFirecrackers,
    asset: 'tile-booster-row-firecracker',
    rowEffects: 1,
    columnEffects: 1,
  },
  {
    name: 'two column firecrackers',
    source: BoosterType.ColumnFirecracker,
    target: BoosterType.ColumnFirecracker,
    combination: BoosterCombinationType.ColumnFirecrackers,
    asset: 'tile-booster-column-firecracker',
    rowEffects: 1,
    columnEffects: 1,
  },
  {
    name: 'crossed firecrackers',
    source: BoosterType.RowFirecracker,
    target: BoosterType.ColumnFirecracker,
    combination: BoosterCombinationType.CrossFirecrackers,
    asset: 'tile-booster-combination-cross-firecrackers',
    rowEffects: 1,
    columnEffects: 1,
  },
  {
    name: 'kettle and firecracker',
    source: BoosterType.AreaKettle,
    target: BoosterType.RowFirecracker,
    combination: BoosterCombinationType.KettleFirecracker,
    asset: 'tile-booster-combination-kettle-firecracker',
    rowEffects: 3,
    columnEffects: 3,
  },
]

for (const scenario of scenarios) {
  test(`${scenario.name} show their combination asset before the combined effect`, async ({ page }, testInfo) => {
    await openBoosterBoard(page, scenario.source, scenario.target)

    const tiles = await getTiles(page)
    const source = tiles.find(tile => tile.row === SOURCE.row && tile.column === SOURCE.column)!
    const target = tiles.find(tile => tile.row === TARGET.row && tile.column === TARGET.column)!

    await swipeTile(page, source, target)

    const combination = page.locator(`.b-game-booster-combination--${scenario.combination}`)

    await expect(combination).toBeVisible()
    await expect(combination).toHaveCSS('background-image', new RegExp(`${scenario.asset}\\.`))
    await testInfo.attach(`${scenario.combination}-phase`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    })
    await expect(combination).toHaveCount(0)
    await expect(page.locator(`.b-game-booster-effect--${BoosterType.RowFirecracker}`))
      .toHaveCount(scenario.rowEffects)
    await expect(page.locator(`.b-game-booster-effect--${BoosterType.ColumnFirecracker}`))
      .toHaveCount(scenario.columnEffects)
    await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24', { timeout: 10_000 })
    await expect(page.locator('.b-game-ground__tile')).toHaveCount(TILE_COUNT)
  })
}

test('kettle body inflates while its handle stays still before explosion', async ({ page }, testInfo) => {
  await openBoosterBoard(page, BoosterType.AreaKettle)

  const kettle = page.locator(`.b-game-ground__tile[data-tile-id="${getTileId(SOURCE)}"]`)

  await kettle.dblclick()
  await expect(kettle).toHaveClass(/b-game-tile--detonating-kettle/)

  const deformation = await getKettleBodyDeformation(kettle)

  await testInfo.attach('kettle-swell-before-explosion', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  expect(deformation.body.clipPath).not.toBe('none')
  expect(deformation.body.inflated.x - deformation.body.resting.x)
    .toBeGreaterThan(deformation.body.inflated.y - deformation.body.resting.y)
  expect(deformation.tile.backgroundImage).toContain('tile-booster-area-kettle')
  expect(deformation.tile.inflatedTransform).toBe(deformation.tile.restingTransform)
  await expect(kettle).toHaveCount(0)
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24', { timeout: 10_000 })
})

test('starting a new game cancels a combination before its effect starts', async ({ page }) => {
  await openBoosterBoard(page, BoosterType.RowFirecracker, BoosterType.ColumnFirecracker)

  const tiles = await getTiles(page)
  const source = tiles.find(tile => tile.row === SOURCE.row && tile.column === SOURCE.column)!
  const target = tiles.find(tile => tile.row === TARGET.row && tile.column === TARGET.column)!

  await swipeTile(page, source, target)
  await expect(page.locator('.b-game-booster-combination')).toBeVisible()
  await page.getByRole('button', { name: 'New game' }).click()

  await expect(page.locator('.b-game-booster-combination')).toHaveCount(0)
  await expect(page.locator('.b-game-booster-effect')).toHaveCount(0)
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('25')
  await page.waitForTimeout(1_100)
  await expect(page.locator('.b-game-booster-combination')).toHaveCount(0)
  await expect(page.locator('.b-game-booster-effect')).toHaveCount(0)
  await expect(page.locator('.b-game-ground__tile')).toHaveCount(TILE_COUNT)
})

const openBoosterBoard = async (
  page: Page,
  source: BoosterType,
  target?: BoosterType
): Promise<void> => {
  const state = createPlayerState()
  const snapshot = createSnapshot(source, target)

  state.statistics.gamesStarted = 1
  state.levels[1] = {
    levelId: 1,
    completed: false,
    updatedAt: snapshot.updatedAt,
    attempt: snapshot,
  }
  await seedPlayerState(page, state)
  await page.goto('/game/1?resume=1')
  await expect(page.locator('.b-game-ground')).toBeVisible()
}

const createSnapshot = (source: BoosterType, target?: BoosterType): GameSnapshot => {
  const board = Array.from({ length: BOARD_HEIGHT }, (_, row) => Array.from(
    { length: BOARD_WIDTH },
    (_, column) => createTile(row, column)
  ))
  const now = Date.now()

  board[SOURCE.row][SOURCE.column].type = source
  if (target !== undefined) {
    board[TARGET.row][TARGET.column].type = target
  }

  return {
    levelId: 1,
    board,
    objectives: [{ type: SpecialTileType.Mug, count: 99 }],
    counters: COUNTER_TYPES.map(type => ({ type, count: 0 })),
    turns: 25,
    nextTileId: TILE_COUNT,
    startedAt: now,
    updatedAt: now,
    statistics: createSessionStatistics(),
  }
}

const createTile = (row: number, column: number): Tile => ({
  id: getTileId({ row, column }),
  type: AVAILABLE_TILE_TYPES[(row * 2 + column) % AVAILABLE_TILE_TYPES.length],
  selected: false,
  row,
  column,
})

const getTileId = ({ row, column }: { row: number, column: number }): number => (
  row * BOARD_WIDTH + column
)

const getKettleBodyDeformation = async (kettle: ReturnType<Page['locator']>) => kettle.evaluate(
  async (element) => {
    const animation = element.ownerDocument.getAnimations().find(candidate => (
      candidate instanceof CSSAnimation
      && candidate.animationName === 'b-game-tile-kettle-body-inflation'
      && candidate.effect instanceof KeyframeEffect
      && candidate.effect.target === element
      && candidate.effect.pseudoElement === '::before'
    ))

    if (animation === undefined) {
      throw new Error('Kettle should have a detonation animation')
    }

    const measure = () => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(element, '::before').transform)

      return {
        bodyScale: { x: Math.hypot(matrix.a, matrix.b), y: Math.hypot(matrix.c, matrix.d) },
        tileTransform: getComputedStyle(element).transform,
      }
    }
    const seek = async (progress: number) => {
      animation.currentTime = Number(animation.effect?.getTiming().duration) * progress
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

      return measure()
    }

    animation.pause()

    const resting = await seek(0)
    const inflated = await seek(0.82)

    return {
      body: {
        clipPath: getComputedStyle(element, '::before').clipPath,
        resting: resting.bodyScale,
        inflated: inflated.bodyScale,
      },
      tile: {
        backgroundImage: getComputedStyle(element).backgroundImage,
        restingTransform: resting.tileTransform,
        inflatedTransform: inflated.tileTransform,
      },
    }
  }
)
