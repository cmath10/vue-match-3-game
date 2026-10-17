import type { Board } from '@/domain/types'
import type { FixedTileDefinition } from '@/domain/levels/types'

import { expect, test } from '@playwright/test'

import { AttemptRandom } from '@/domain/random'
import { createLevelPreview } from '@/presentation/levelPreview'
import { createPlayerState } from '@/domain/progress'
import { findMatchedPositions } from '@/domain/board/matches'
import { getCatalogLevel } from '@/domain/levels/catalog'
import { getLevelIds } from '@/domain/progress'
import { hasAvailableMove } from '@/domain/board/availableMoves'
import { materializeInitialBoard } from '@/domain/levels/materializeInitialBoard'

import { getTiles } from './helpers/game-board'
import { seedPlayerState } from './helpers/player-state'

const visualTile = (tile: FixedTileDefinition) => ({
  type: tile.type,
  blocker: tile.kind === 'ordinary' ? tile.blocker?.type : undefined,
  health: tile.kind === 'special' && 'health' in tile ? tile.health : undefined,
})

for (const levelId of [1, 3, 11, 13, 15]) {
  test(`level ${levelId} preview matches the freshly started game`, async ({ page }, testInfo) => {
    await page.addInitScript(seed => {
      Math.random = () => seed / 0x1_0000_0000
    }, levelId)
    const state = createPlayerState()

    state.highestUnlockedLevel = levelId
    state.levels[levelId] = { levelId, completed: true, lastResult: 'win', updatedAt: 1 }
    await seedPlayerState(page, state)
    await page.goto('/levels')
    const card = page.getByRole('link', { name: `Open level ${levelId}`, exact: true })
    const cells = card.locator('.b-level-preview__cell')

    await expect(cells).toHaveCount(getCatalogLevel(levelId).topology.playableCells.size)
    const preview = await cells.evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element)
      const classes = [...element.querySelector('.b-game-tile')!.classList]

      return {
        row: Number.parseInt(style.gridRowStart) - 1,
        column: Number.parseInt(style.gridColumnStart) - 1,
        type: classes.find(name => /^b-game-tile--(sweets|special)-/.test(name))!
          .replace('b-game-tile--', ''),
        blocked: classes.some(name => name.startsWith('b-game-tile--blocker-')),
      }
    }))

    await testInfo.attach(`level-${levelId}-preview`, {
      body: await card.screenshot(), contentType: 'image/png',
    })
    await page.goto(`/game/${levelId}`)
    await expect(page.locator('.b-game-ground__tile')).toHaveCount(preview.length)
    const actual = (await getTiles(page)).map(({ row, column, type, blocked }) => ({
      row, column, type, blocked,
    }))

    expect(preview).toEqual(actual)
    await testInfo.attach(`level-${levelId}-starting-board`, {
      body: await page.screenshot(), contentType: 'image/png',
    })
  })
}

test('level previews show a reproducible playable starting board', () => {
  for (const levelId of getLevelIds()) {
    const level = getCatalogLevel(levelId)
    const preview = createLevelPreview(level)
    const board = materializeInitialBoard(level, new AttemptRandom(levelId))
    const occupancy: Board<string> = board.map(row => row.map((): null => null))
    const movable = board.map(row => row.map(() => false))

    expect(createLevelPreview(level)).toEqual(preview)
    expect(preview.tiles).toHaveLength(level.topology.playableCells.size)
    for (const tile of preview.tiles) {
      const row = tile.style.gridRow - 1
      const column = tile.style.gridColumn - 1
      const materialized = board[row][column]!

      expect(tile).toMatchObject(visualTile(materialized))
      expect(tile.key).toBe(`${row}:${column}`)
      occupancy[row][column] = materialized.kind === 'ordinary' ? tile.type : null
      movable[row][column] = materialized.kind === 'ordinary' && tile.blocker === undefined
    }
    const state = { topology: level.topology, occupancy }

    expect(findMatchedPositions(state)).toEqual([])
    expect(hasAvailableMove(state, movable)).toBe(true)
  }
})
