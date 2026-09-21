import type { GameSnapshot } from '@/domain/progress'
import type { Tile } from '@/domain/types'

import { expect, test } from '@playwright/test'

import { AttemptRandom } from '@/domain/random'
import { BoosterType } from '@/domain/enums'
import { CATALOG_LEVEL_REVISION } from '@/domain/levels/catalog'
import { COUNTER_TYPES } from '@/domain/config'
import { createPlayerState, createSessionStatistics } from '@/domain/progress'
import { getCatalogLevel } from '@/domain/levels/catalog'
import { materializeInitialBoard } from '@/domain/levels/materializeInitialBoard'

import { seedPlayerState } from './helpers/player-state'

const createSlopeSnapshot = (): GameSnapshot => {
  const level = getCatalogLevel(11)
  const random = new AttemptRandom(11)
  const { width, height } = level.topology.bounds
  const board = materializeInitialBoard(level, random).map((row, rowIndex) => row.map((tile, column): Tile | null => (
    tile === null ? null : {
      ...tile,
      id: rowIndex * width + column,
      row: rowIndex,
      column,
      selected: false,
    }
  )))

  board[5][4]!.type = BoosterType.RowFirecracker
  return {
    level: { kind: 'catalog', levelId: 11, levelRevision: CATALOG_LEVEL_REVISION },
    random: random.snapshot(),
    gravity: { nextIncomingIndexByCell: {} },
    board,
    objectives: level.objectives.map(objective => ({ ...objective })),
    counters: COUNTER_TYPES.map(type => ({ type, count: 0 })),
    turns: 25,
    nextTileId: width * height,
    startedAt: 1,
    updatedAt: 1,
    statistics: createSessionStatistics(),
  }
}

test('level 11 animates a tile down the slope in one diagonal motion', async ({ page }, testInfo) => {
  const state = createPlayerState()

  state.highestUnlockedLevel = 11
  state.levels[11] = { levelId: 11, completed: false, updatedAt: 1, attempt: createSlopeSnapshot() }
  await seedPlayerState(page, state)
  await page.goto('/game/11?resume=1')
  const width = getCatalogLevel(11).topology.bounds.width
  const tile = page.locator(`[data-tile-id="${4 * width}"]`)
  const firecracker = page.locator(`[data-tile-id="${5 * width + 4}"]`)

  await expect(tile).toBeVisible()
  const start = await tile.boundingBox()

  await firecracker.dblclick()
  await expect(tile).toHaveAttribute('style', /translate\(calc\(1 \*.*calc\(5 \*/)
  const middle = await tile.evaluate(async element => {
    const transition = element.getAnimations().find(animation => (
      animation instanceof CSSTransition && animation.transitionProperty === 'transform'
    ))

    if (transition === undefined) {
      throw new Error('Expected the slope movement to animate')
    }
    transition.pause()
    transition.currentTime = Number(transition.effect!.getTiming().duration) / 2
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    const rect = element.getBoundingClientRect().toJSON()

    transition.play()
    return rect
  })

  expect(middle.x).toBeGreaterThan(start!.x)
  expect(middle.y).toBeGreaterThan(start!.y)
  expect(middle.x - start!.x).toBeCloseTo(middle.y - start!.y, 1)
  await testInfo.attach('level-11-diagonal-slide', {
    body: await page.screenshot(), contentType: 'image/png',
  })
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24', { timeout: 10_000 })
})
