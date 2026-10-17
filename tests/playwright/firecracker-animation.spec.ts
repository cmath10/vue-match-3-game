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

const scenarios = [
  { levelId: 15, type: BoosterType.RowFirecracker, row: 0, column: 1, probeRow: 0, probeColumn: 10 },
  { levelId: 5, type: BoosterType.ColumnFirecracker, row: 1, column: 3, probeRow: 6, probeColumn: 3 },
]

const createSnapshot = (scenario: typeof scenarios[number]): GameSnapshot => {
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
    animation.currentTime = Number(animation.effect!.getTiming().duration) * fraction
  })

  return [...element.querySelectorAll('.b-game-booster-effect__firecracker')].map(rocket => {
    const rect = rocket.getBoundingClientRect()
    const flame = rocket.querySelector('.b-game-booster-effect__exhaust')!
    const flameRect = flame.getBoundingClientRect()

    return {
      x: rect.x + rect.width / 2, y: rect.y + rect.height / 2,
      width: rect.width, height: rect.height,
      flameWidth: flameRect.width, flameHeight: flameRect.height,
      flameOpacity: Number(getComputedStyle(flame).opacity),
    }
  })
}, progress)

for (const scenario of scenarios) {
  test(`${scenario.type} winds up, ignites and accelerates across a hole`, async ({ page }, testInfo) => {
    if (scenario.type === BoosterType.ColumnFirecracker) {
      await page.setViewportSize({ width: 390, height: 844 })
    }
    const state = createPlayerState()
    const snapshot = createSnapshot(scenario)

    state.highestUnlockedLevel = scenario.levelId
    state.levels[scenario.levelId] = { levelId: scenario.levelId, completed: false, updatedAt: 1, attempt: snapshot }
    await seedPlayerState(page, state)
    await page.goto(`/game/${scenario.levelId}?resume=1`)
    await expect(page.locator('.b-game-ground__tile')).toHaveCount(getCatalogLevel(scenario.levelId).topology.playableCells.size)
    await page.clock.install()
    await page.clock.pauseAt(new Date())
    const source = page.locator(`[data-tile-id="${snapshot.board[scenario.row][scenario.column]!.id}"]`)
    const effect = page.locator(`.b-game-booster-effect--${scenario.type}`)

    await source.dblclick()
    await expect(effect).toBeVisible()
    await expect(source).toHaveCSS('visibility', 'hidden')
    expect(await effect.evaluate(element => getComputedStyle(element, '::before').content)).toBe('none')
    expect(await effect.evaluate(element => getComputedStyle(element, '::after').content)).toBe('none')
    const start = await sampleFrame(effect, 0)
    const squeezed = await sampleFrame(effect, 0.16)
    const axis = scenario.type === BoosterType.RowFirecracker ? 'x' : 'y'
    const size = axis === 'x' ? 'width' : 'height'
    const flameSize = axis === 'x' ? 'flameWidth' : 'flameHeight'

    expect(start.every(rocket => rocket.flameOpacity === 0)).toBe(true)
    expect(squeezed[0][size]).toBeLessThan(start[0][size] * 0.7)
    const ignition = await sampleFrame(effect, 0.32)
    const ready = await sampleFrame(effect, 0.46)

    expect(ready[0][axis]).toBeCloseTo(start[0][axis], 0)
    expect(ready[1][axis]).toBeCloseTo(start[1][axis], 0)
    expect(ready[0][flameSize]).toBeGreaterThan(ignition[0][flameSize] * 2)
    expect(ready.every(rocket => rocket.flameOpacity === 1)).toBe(true)
    await testInfo.attach('firecracker-ignition', { body: await page.screenshot(), contentType: 'image/png' })
    const flight = await sampleFrame(effect, 0.75)

    expect(flight[0][axis]).toBeLessThan(ready[0][axis] - 5)
    expect(flight[1][axis]).toBeGreaterThan(ready[1][axis] + 5)
    expect(flight[0][flameSize]).toBeLessThan(ready[0][flameSize])
    await testInfo.attach('firecracker-flight', { body: await page.screenshot(), contentType: 'image/png' })
    await page.clock.runFor(800)
    await expect(effect).toBeVisible()
    await page.clock.runFor(160)
    await expect(effect).toHaveCount(0)
    await expect(page.locator(`[data-tile-id="${snapshot.board[scenario.probeRow][scenario.probeColumn]!.id}"]`)).toHaveCount(0)
    await page.clock.resume()
    await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24', { timeout: 15_000 })
    await expect(page.locator('.b-game-ground__tile')).toHaveCount(getCatalogLevel(scenario.levelId).topology.playableCells.size)
  })
}

for (const elapsed of [320, 700]) {
  test(`restarting after ${elapsed}ms cancels firecrackers without changing the new board`, async ({ page }) => {
    const scenario = scenarios[0]
    const snapshot = createSnapshot(scenario)
    const state = createPlayerState()

    state.highestUnlockedLevel = scenario.levelId
    state.levels[scenario.levelId] = { levelId: scenario.levelId, completed: false, updatedAt: 1, attempt: snapshot }
    await seedPlayerState(page, state)
    await page.goto(`/game/${scenario.levelId}?resume=1`)
    await expect(page.locator('.b-game-ground__tile')).toHaveCount(getCatalogLevel(scenario.levelId).topology.playableCells.size)
    await page.clock.install()
    await page.clock.pauseAt(new Date())
    await page.locator(`[data-tile-id="${snapshot.board[scenario.row][scenario.column]!.id}"]`).dblclick()
    await page.clock.runFor(elapsed)
    await expect(page.locator('.b-game-booster-effect')).toHaveCount(1)
    await page.getByRole('button', { name: 'New game' }).click()
    await expect(page.locator('.b-game-booster-effect')).toHaveCount(0)
    const readBoard = () => page.locator('.b-game-ground__tile').evaluateAll(tiles => tiles.map(tile => ({
      id: tile.getAttribute('data-tile-id'), classes: tile.className, style: tile.getAttribute('style'),
    })))
    const freshBoard = await readBoard()

    await page.clock.runFor(1500)
    expect(await readBoard()).toEqual(freshBoard)
    await expect(page.locator('.b-game-menu__turns-value')).toHaveText('25')
  })
}
