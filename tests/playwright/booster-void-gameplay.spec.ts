import type { GameSnapshot } from '@/domain/progress'
import type { Page } from '@playwright/test'
import type { Position, Tile } from '@/domain/types'

import { expect, test } from '@playwright/test'

import { AttemptRandom } from '@/domain/random'
import { BoosterType } from '@/domain/enums'
import { CATALOG_LEVEL_REVISION } from '@/domain/levels/catalog'
import { COUNTER_TYPES } from '@/domain/config'
import { createPlayerState, createSessionStatistics } from '@/domain/progress'
import { getCatalogLevel } from '@/domain/levels/catalog'
import { materializeInitialBoard } from '@/domain/levels/materializeInitialBoard'

import { getTiles } from './helpers/game-board'
import { seedPlayerState } from './helpers/player-state'
import { swipeTile } from './helpers/game-board'

type BoosterPlacement = Position & { type: BoosterType }
type Scenario = {
  name: string
  levelId: number
  boosters: BoosterPlacement[]
  probe: Position
  swipe?: boolean
  rowEffects: number
  columnEffects: number
}

const scenarios: Scenario[] = [
  {
    name: 'row firecracker crosses the wide gap between the upper lobes',
    levelId: 15,
    boosters: [{ row: 0, column: 1, type: BoosterType.RowFirecracker }],
    probe: { row: 0, column: 10 }, rowEffects: 1, columnEffects: 0,
  },
  {
    name: 'column firecracker crosses the enclosed two-cell hole',
    levelId: 5,
    boosters: [{ row: 1, column: 3, type: BoosterType.ColumnFirecracker }],
    probe: { row: 6, column: 3 }, rowEffects: 0, columnEffects: 1,
  },
  {
    name: 'kettle hits a tile across the gap inside its radius',
    levelId: 15,
    boosters: [{ row: 3, column: 4, type: BoosterType.AreaKettle }],
    probe: { row: 3, column: 6 }, rowEffects: 0, columnEffects: 0,
  },
  {
    name: 'wide cross includes a projected row whose origin is in a hole',
    levelId: 15,
    boosters: [
      { row: 2, column: 3, type: BoosterType.AreaKettle },
      { row: 2, column: 4, type: BoosterType.RowFirecracker },
    ],
    probe: { row: 1, column: 10 }, swipe: true, rowEffects: 3, columnEffects: 3,
  },
  {
    name: 'a firecracker across a hole starts a second full-length effect',
    levelId: 15,
    boosters: [
      { row: 0, column: 1, type: BoosterType.RowFirecracker },
      { row: 0, column: 10, type: BoosterType.ColumnFirecracker },
    ],
    probe: { row: 8, column: 10 }, rowEffects: 1, columnEffects: 1,
  },
]

const createSnapshot = ({ levelId, boosters }: Scenario): GameSnapshot => {
  const level = getCatalogLevel(levelId)
  const random = new AttemptRandom(levelId)
  const { width, height } = level.topology.bounds
  const board = materializeInitialBoard(level, random).map((row, rowIndex) => row.map((tile, column): Tile | null => (
    tile === null ? null : { ...tile, id: rowIndex * width + column, row: rowIndex, column, selected: false }
  )))

  boosters.forEach(({ row, column, type }) => board[row][column]!.type = type)
  return {
    level: { kind: 'catalog', levelId, levelRevision: CATALOG_LEVEL_REVISION },
    random: random.snapshot(), gravity: { nextIncomingIndexByCell: {} }, board,
    objectives: level.objectives.map(objective => ({ ...objective })),
    counters: COUNTER_TYPES.map(type => ({ type, count: 0 })),
    turns: 25, nextTileId: width * height, startedAt: 1, updatedAt: 1,
    statistics: createSessionStatistics(),
  }
}

const activate = async (page: Page, scenario: Scenario): Promise<void> => {
  const tiles = await getTiles(page)
  const participants = scenario.boosters.map(position => tiles.find(tile => (
    tile.row === position.row && tile.column === position.column
  ))!)

  if (scenario.swipe) {
    await swipeTile(page, participants[0], participants[1])
  } else {
    await page.locator(`[data-tile-id="${participants[0].id}"]`).dblclick()
  }
}

for (const scenario of scenarios) {
  test(scenario.name, async ({ page }, testInfo) => {
    const state = createPlayerState()
    const snapshot = createSnapshot(scenario)
    const { levelId, probe } = scenario

    state.highestUnlockedLevel = levelId
    state.levels[levelId] = { levelId, completed: false, updatedAt: 1, attempt: snapshot }
    await seedPlayerState(page, state)
    await page.goto(`/game/${levelId}?resume=1`)
    await expect(page.locator('.b-game-ground__tile')).toHaveCount(getCatalogLevel(levelId).topology.playableCells.size)
    await activate(page, scenario)
    await expect(page.locator('.b-game-booster-effect')).not.toHaveCount(0)
    await expect(page.locator(`.b-game-booster-effect--${BoosterType.RowFirecracker}`)).toHaveCount(scenario.rowEffects)
    await expect(page.locator(`.b-game-booster-effect--${BoosterType.ColumnFirecracker}`)).toHaveCount(scenario.columnEffects)
    await testInfo.attach('booster-crossing-void', { body: await page.screenshot(), contentType: 'image/png' })

    const fragments = page.locator(
      `.b-game-tile-break[style*="translate(calc(${probe.column} *"][style*=", calc(${probe.row} *"]`
    )

    await expect(fragments).toHaveCount(1)
    await expect(page.locator(`[data-tile-id="${snapshot.board[probe.row][probe.column]!.id}"]`)).toHaveCount(0)
    await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24', { timeout: 10_000 })
    await expect(page.locator('.b-game-ground__tile')).toHaveCount(getCatalogLevel(levelId).topology.playableCells.size)
  })
}
