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
import { TileType } from '@/domain/enums'

import { getTiles } from './helpers/game-board'
import { seedPlayerState } from './helpers/player-state'
import { swipeTile } from './helpers/game-board'

const createSnapshot = (type: TileType): GameSnapshot => {
  const level = getCatalogLevel(15)
  const random = new AttemptRandom(15)
  const { width, height } = level.topology.bounds
  const board = materializeInitialBoard(level, random).map((row, rowIndex) => row.map((tile, column): Tile | null => (
    tile === null ? null : { ...tile, id: rowIndex * width + column, row: rowIndex, column, selected: false }
  )))

  board[0][0]!.type = BoosterType.ButtonBox
  board[0][1]!.type = type
  board[0][10]!.type = type
  return {
    level: { kind: 'catalog', levelId: 15, levelRevision: CATALOG_LEVEL_REVISION },
    random: random.snapshot(), gravity: { nextIncomingIndexByCell: {} }, board,
    objectives: level.objectives.map(objective => ({ ...objective })),
    counters: COUNTER_TYPES.map(counterType => ({ type: counterType, count: 0 })),
    turns: 25, nextTileId: width * height, startedAt: 1, updatedAt: 1,
    statistics: createSessionStatistics(),
  }
}

for (const type of Object.values(TileType)) {
  test(`${type}: lightning, highlighted candy, highlighted button and plain button flight`, async ({ page }, testInfo) => {
    if (type === TileType.SweetsFish) {
      await page.setViewportSize({ width: 390, height: 844 })
    }
    if (type === TileType.SweetsPillow) {
      await page.setViewportSize({ width: 844, height: 390 })
    }
    const state = createPlayerState()
    const snapshot = createSnapshot(type)
    const asset = type.replace('sweets-', '')

    state.highestUnlockedLevel = 15
    state.levels[15] = { levelId: 15, completed: false, updatedAt: 1, attempt: snapshot }
    await seedPlayerState(page, state)
    await page.goto('/game/15?resume=1')
    await expect(page.locator('.b-game-ground__tile')).toHaveCount(getCatalogLevel(15).topology.playableCells.size)
    await page.clock.install()
    await page.clock.pauseAt(new Date())
    const tiles = await getTiles(page)
    const source = tiles.find(tile => tile.row === 0 && tile.column === 0)!
    const target = tiles.find(tile => tile.row === 0 && tile.column === 1)!
    const probe = page.locator('[data-button-tile-id="10"]')

    await swipeTile(page, source, target)
    // Run the swap and the two rendering frames before the first timed phase.
    for (let step = 0; step < 30 && await probe.count() === 0; step++) {
      await page.clock.runFor(20)
    }
    await page.clock.runFor(40)
    await expect(probe).toHaveAttribute('data-button-phase', 'targeting')
    await expect(probe).toHaveCSS('background-image', new RegExp(`tile-sweets-${asset}\\.png`))
    const beam = probe.locator('xpath=preceding-sibling::*[1]')
    const appearance = await beam.evaluate((element) => {
      const animation = element.getAnimations()[0]
      const duration = Number(animation.effect!.getTiming().duration)

      animation.pause()
      animation.currentTime = duration / 2
      return { duration, opacity: Number(getComputedStyle(element).opacity) }
    })

    expect(appearance.duration).toBe(240)
    expect(appearance.opacity).toBeGreaterThan(0.1)
    expect(appearance.opacity).toBeLessThan(0.9)
    await beam.evaluate(element => element.getAnimations()[0].finish())
    const endpoints = await beam.locator('.b-game-button__lightning-core').evaluate((element) => {
      const path = element as SVGPathElement
      const matrix = path.getScreenCTM()!
      const start = path.getPointAtLength(0).matrixTransform(matrix)
      const end = path.getPointAtLength(path.getTotalLength()).matrixTransform(matrix)

      return { start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y } }
    })
    await expect.poll(async () => {
      const box = await page.locator(`[data-tile-id="${source.id}"]`).boundingBox()

      return Math.abs(endpoints.start.x - box!.x - box!.width / 2)
    }).toBeLessThan(0.5)
    const box = await page.locator(`[data-tile-id="${source.id}"]`).boundingBox()
    const origin = await probe.boundingBox()

    expect(endpoints.start.x).toBeCloseTo(box!.x + box!.width / 2, 0)
    expect(endpoints.start.y).toBeCloseTo(box!.y + box!.height / 2, 0)
    expect(endpoints.end.x).toBeCloseTo(origin!.x + origin!.width / 2, 0)
    expect(endpoints.end.y).toBeCloseTo(origin!.y + origin!.height / 2, 0)
    await page.clock.runFor(240)
    await expect(probe).toHaveAttribute('data-button-phase', 'highlighted')
    await expect(probe).toHaveCSS('background-image', new RegExp(`tile-sweets-${asset}-highlighted\\.png`))
    await testInfo.attach('highlighted-candy', { body: await page.screenshot(), contentType: 'image/png' })
    await page.clock.runFor(180)
    await expect(probe).toHaveAttribute('data-button-phase', 'transformed')
    await expect(probe).toHaveCSS('background-image', new RegExp(`tile-button-${asset}-highlighted\\.png`))
    await expect.poll(() => probe.evaluate(element => getComputedStyle(element, '::before').opacity)).toBe('0')
    await testInfo.attach('button-transformation', { body: await page.screenshot(), contentType: 'image/png' })
    await page.clock.runFor(180)
    await expect(probe).toHaveAttribute('data-button-phase', 'fading')
    const fade = await beam.evaluate((element) => {
      const animation = element.getAnimations()[0]
      const duration = Number(animation.effect!.getTiming().duration)

      animation.pause()
      animation.currentTime = duration / 4
      const early = Number(getComputedStyle(element).opacity)

      animation.currentTime = duration * 3 / 4
      const late = Number(getComputedStyle(element).opacity)

      return { duration, early, late }
    })

    expect(fade.duration).toBe(240)
    expect(fade.early).toBeGreaterThan(fade.late)
    expect(fade.early).toBeLessThan(1)
    expect(fade.late).toBeGreaterThan(0)
    expect((await probe.boundingBox())!.x).toBeCloseTo(origin!.x, 0)
    await testInfo.attach('fading-lightning', { body: await page.screenshot(), contentType: 'image/png' })
    await beam.evaluate(element => element.getAnimations()[0].finish())
    await expect(beam).toHaveCSS('opacity', '0')
    await page.clock.runFor(240)
    await expect(probe).toHaveAttribute('data-button-phase', 'flying')
    await expect(probe).toHaveCSS('background-image', new RegExp(`tile-button-${asset}\\.png`))
    await expect(page.locator('.b-game-button__lightning')).toHaveCount(0)
    await expect(probe).toHaveCSS('filter', 'none')
    await expect.poll(async () => (await probe.boundingBox())!.x).toBeLessThan(origin!.x - 20)
    await testInfo.attach('plain-button-flight', { body: await page.screenshot(), contentType: 'image/png' })
    await page.clock.runFor(480)
    await expect(probe).toHaveCount(0)
    await page.clock.resume()
    await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24', { timeout: 15_000 })
    await expect(page.locator('.b-game-ground__tile')).toHaveCount(getCatalogLevel(15).topology.playableCells.size)
  })
}
