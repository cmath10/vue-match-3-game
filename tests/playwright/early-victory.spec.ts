import type { GameSnapshot } from '@/domain/progress'
import type { Page } from '@playwright/test'
import type { PlayerState } from '@/domain/progress'
import type { Tile } from '@/domain/types'

import { expect, test } from '@playwright/test'

import { AttemptRandom } from '@/domain/random'
import { BoosterType } from '@/domain/enums'
import { COUNTER_TYPES } from '@/domain/config'
import { createPlayerState, createSessionStatistics } from '@/domain/progress'
import { getCatalogLevel } from '@/domain/levels/catalog'
import { materializeInitialBoard } from '@/domain/levels/materializeInitialBoard'
import { TileType } from '@/domain/enums'

import { seedPlayerState } from './helpers/player-state'

const createWinningAttempt = (turns: number): GameSnapshot => {
  const level = getCatalogLevel(1)
  const random = new AttemptRandom(1)
  const { width, height } = level.topology.bounds
  const board = materializeInitialBoard(level, random).map((row, rowIndex) => row.map((tile, column): Tile | null => (
    tile === null ? null : { ...tile, id: rowIndex * width + column, row: rowIndex, column, selected: false }
  )))

  board[4][4]!.type = BoosterType.RowFirecracker
  board[4][0]!.type = TileType.SweetsFish
  return {
    level: { kind: 'catalog', levelId: 1, levelRevision: level.revision },
    random: random.snapshot(), gravity: { nextIncomingIndexByCell: {} }, board,
    objectives: level.objectives.map(objective => ({ ...objective })),
    counters: COUNTER_TYPES.map(type => ({
      type,
      count: Math.max(0, (level.objectives.find(objective => objective.type === type)?.count ?? 0)
        - (type === TileType.SweetsFish ? 1 : 0)),
    })),
    turns, nextTileId: width * height, startedAt: 1, updatedAt: 1,
    statistics: createSessionStatistics(),
  }
}

const openWinningAttempt = async (page: Page, turns = 25, controlledClock = false): Promise<void> => {
  const state = createPlayerState()

  state.statistics.gamesStarted = 1
  state.levels[1] = { levelId: 1, completed: false, updatedAt: 1, attempt: createWinningAttempt(turns) }
  await seedPlayerState(page, state)
  await page.goto('/game/1?resume=1')
  if (controlledClock) {
    await page.clock.install()
    await page.clock.pauseAt(new Date())
  }
  await page.locator(`[data-tile-id="${4 * getCatalogLevel(1).topology.bounds.width + 4}"]`).dblclick()
  if (controlledClock) {
    for (let step = 0; step < 100 && await page.locator('.b-game-objective-flight').count() === 0; step++) {
      await page.clock.runFor(20)
    }
  }
  await expect(page.locator('.b-game-objective-flight').first()).toBeVisible()
  expect(await page.getByText('You win!', { exact: true }).isVisible()).toBe(true)
}

const readState = (page: Page): Promise<PlayerState> => page.evaluate(async modulePath => {
  const { loadPlayerState } = await import(modulePath)

  return loadPlayerState()
}, '/src/storage/playerStateRepository.ts')

test('victory appears while the last objective flies and the board keeps animating underneath', async ({ page }, testInfo) => {
  await openWinningAttempt(page, 1, true)
  const flights = page.locator('.b-game-objective-flight')

  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('0')
  await expect(page.locator('.b-game-menu__objective--completed')).toHaveCount(2)
  const animation = await flights.first().evaluate(element => {
    const overlay = document.querySelector('.b-game-layout__result')!
    const rect = overlay.getBoundingClientRect()
    const layering = {
      overlay: Number(getComputedStyle(overlay).zIndex),
      flight: Number(getComputedStyle(element).zIndex),
      interceptsInput: overlay.contains(document.elementFromPoint(rect.x + 20, rect.y + 20)),
    }
    const before = getComputedStyle(element).transform

    return { before, layering }
  })

  await page.clock.runFor(50)
  await expect.poll(() => flights.first().evaluate(element => getComputedStyle(element).transform))
    .not.toBe(animation.before)
  expect(animation.layering.overlay).toBeGreaterThan(animation.layering.flight)
  expect(animation.layering.interceptsInput).toBe(true)
  await testInfo.attach('victory-with-background-animations', { body: await page.screenshot(), contentType: 'image/png' })
  await page.clock.resume()
  await expect(flights).toHaveCount(0)
  await expect(page.locator('.b-game-tile-break')).toHaveCount(0)
  await expect(page.getByText('You win!', { exact: true })).toBeVisible()
  await expect.poll(async () => (await readState(page)).statistics.gamesWon).toBe(1)
  expect((await readState(page)).statistics.turnsPlayed).toBe(1)
})

test('next level can open during victory animations without losing or recounting the win', async ({ page }) => {
  await openWinningAttempt(page)
  await page.getByRole('button', { name: 'Next level' }).click()
  await expect(page).toHaveURL(/\/game\/2$/)
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('25')
  await page.waitForTimeout(1_200)
  const state = await readState(page)

  expect(state.levels[1].completed).toBe(true)
  expect(state.levels[1].attempt).toBeUndefined()
  expect(state.levels[2].attempt?.turns).toBe(25)
  expect(state.statistics.gamesWon).toBe(1)
  expect(state.statistics.turnsPlayed).toBe(1)
  await expect(page.locator('.b-game-objective-flight')).toHaveCount(0)
})

test('replaying during victory animations leaves a fresh attempt untouched by old callbacks', async ({ page }) => {
  await openWinningAttempt(page)
  await page.getByRole('button', { name: 'Play again' }).click()
  await expect(page.locator('.b-game-layout__result')).toHaveCount(0)
  await page.waitForTimeout(1_200)
  const state = await readState(page)

  expect(state.levels[1].completed).toBe(true)
  expect(state.levels[1].attempt?.turns).toBe(25)
  expect(state.levels[1].attempt?.counters.every(counter => counter.count === 0)).toBe(true)
  expect(state.statistics.gamesWon).toBe(1)
  expect(state.statistics.turnsPlayed).toBe(1)
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('25')
})

test('statistics after an early win are added once and a new attempt resets their baseline', async ({ page }) => {
  await seedPlayerState(page, createPlayerState())
  await page.evaluate(async ({ snapshot, fish, pillow, progressPath }) => {
    const { useGameProgress } = await import(progressPath)
    const progress = useGameProgress({
      getLevel: () => snapshot.level, getRandom: () => snapshot.random,
      getGravity: () => snapshot.gravity, getBoard: () => snapshot.board,
      counters: snapshot.counters, objectives: snapshot.objectives,
      turns: { value: snapshot.turns }, nextTileId: { value: snapshot.nextTileId },
    })

    progress.begin()
    progress.recordTurn()
    progress.recordCollection(fish)
    progress.persist('win')
    progress.recordCollection(fish)
    progress.recordCollection(pillow)
    progress.persist('win')
    progress.persist('win')

    progress.begin()
    progress.recordTurn()
    progress.persist(null)
  }, {
    snapshot: createWinningAttempt(25), fish: TileType.SweetsFish, pillow: TileType.SweetsPillow,
    progressPath: '/src/composables/useGameProgress.ts',
  })

  await expect.poll(async () => (await readState(page)).statistics.turnsPlayed).toBe(2)
  const state = await readState(page)

  expect(state.statistics).toMatchObject({
    gamesStarted: 2, gamesCompleted: 1, gamesWon: 1, turnsPlayed: 2,
    tilesCollected: { [TileType.SweetsFish]: 2, [TileType.SweetsPillow]: 1 },
  })
  expect(state.levels[1].attempt?.statistics.turnsPlayed).toBe(1)
})

test('leaving an unfinished non-winning turn still saves it after its animations', async ({ page }) => {
  const state = createPlayerState()
  const attempt = createWinningAttempt(25)

  attempt.counters.forEach(counter => counter.count = 0)
  state.statistics.gamesStarted = 1
  state.levels[1] = { levelId: 1, completed: false, updatedAt: 1, attempt }
  await seedPlayerState(page, state)
  await page.goto('/game/1?resume=1')
  await page.locator(`[data-tile-id="${4 * getCatalogLevel(1).topology.bounds.width + 4}"]`).dblclick()
  await expect(page.locator('.b-game-objective-flight').first()).toBeVisible()
  await expect(page.locator('.b-game-layout__result')).toHaveCount(0)
  await page.getByRole('button', { name: 'Main menu' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect.poll(async () => (await readState(page)).levels[1].attempt?.turns).toBe(24)
  expect((await readState(page)).statistics.turnsPlayed).toBe(1)
})
