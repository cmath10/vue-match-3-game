import type { GameSnapshot } from '@/domain/progress'
import type { Locator } from '@playwright/test'
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

const scenario = { levelId: 15, type: BoosterType.AreaKettle, row: 3, column: 4 }

const createSnapshot = (): GameSnapshot => {
  const level = getCatalogLevel(scenario.levelId)
  const random = new AttemptRandom(scenario.levelId)
  const { width, height } = level.topology.bounds
  const board = materializeInitialBoard(level, random).map((row, rowIndex) => row.map((tile, column): Tile | null => (
    tile === null ? null : { ...tile, id: rowIndex * width + column, row: rowIndex, column, selected: false }
  )))

  board[scenario.row][scenario.column]!.type = scenario.type
  return {
    level: { kind: 'catalog', levelId: scenario.levelId, levelRevision: CATALOG_LEVEL_REVISION },
    random: random.snapshot(), gravity: { nextIncomingIndexByCell: {} }, board,
    objectives: level.objectives.map(objective => ({ ...objective })),
    counters: COUNTER_TYPES.map(type => ({ type, count: 0 })),
    turns: 25, nextTileId: width * height, startedAt: 1, updatedAt: 1,
    statistics: createSessionStatistics(),
  }
}

const sampleFrame = (effect: Locator, progress: number) => effect.evaluate((element, fraction) => {
  element.getAnimations({ subtree: true }).forEach(animation => {
    animation.pause()
    animation.currentTime = 900 * fraction
  })
  return [...element.querySelectorAll('.b-game-kettle-steam__puff')].map(puff => ({
    opacity: Number(getComputedStyle(puff).opacity),
    transform: getComputedStyle(puff).transform,
    width: puff.getBoundingClientRect().width,
  }))
}, progress)

for (const width of [1366, 390]) {
  test(`kettle steam grows, curls and disperses before clearing at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    const snapshot = createSnapshot()
    const state = createPlayerState()

    state.highestUnlockedLevel = scenario.levelId
    state.levels[scenario.levelId] = { levelId: scenario.levelId, completed: false, updatedAt: 1, attempt: snapshot }
    await seedPlayerState(page, state)
    await page.goto(`/game/${scenario.levelId}?resume=1`)
    await expect(page.locator('.b-game-ground__tile')).toHaveCount(getCatalogLevel(scenario.levelId).topology.playableCells.size)
    await page.clock.install()
    await page.clock.pauseAt(new Date())
    await page.locator(`[data-tile-id="${snapshot.board[scenario.row][scenario.column]!.id}"]`).dblclick()
    const effect = page.locator('.b-game-booster-effect--booster-area-kettle')

    await expect(effect).toBeVisible()
    const initial = await sampleFrame(effect, 0)

    expect(initial.every(puff => puff.opacity === 0)).toBe(true)
    const forming = await sampleFrame(effect, 0.12)

    expect(forming[0].opacity).toBeGreaterThan(0)
    expect(forming[7].opacity).toBe(0)
    await testInfo.attach(`kettle-forming-${width}`, { body: await page.screenshot(), contentType: 'image/png' })
    const billowing = await sampleFrame(effect, 0.48)

    expect(billowing.every(puff => puff.opacity > 0)).toBe(true)
    expect(billowing[0].width).toBeGreaterThan(forming[0].width)
    expect(billowing[0].transform).not.toBe(forming[0].transform)
    await testInfo.attach(`kettle-billowing-${width}`, { body: await page.screenshot(), contentType: 'image/png' })
    const fading = await sampleFrame(effect, 0.94)

    expect(fading.every((puff, index) => puff.opacity < billowing[index].opacity)).toBe(true)
    await testInfo.attach(`kettle-fading-${width}`, { body: await page.screenshot(), contentType: 'image/png' })
    await page.clock.runFor(800)
    await expect(effect).toBeVisible()
    await page.clock.runFor(150)
    await expect(effect).toHaveCount(0)
    await expect(page.locator(`[data-tile-id="${snapshot.board[3][6]!.id}"]`)).toHaveCount(0)
    await page.clock.resume()
    await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24', { timeout: 15_000 })
    await expect(page.locator('.b-game-ground__tile')).toHaveCount(getCatalogLevel(scenario.levelId).topology.playableCells.size)
  })
}
