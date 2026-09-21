import type { CompiledLevel } from '@/domain/levels/types'
import type { MaterializedBoard } from '@/domain/levels/materializeInitialBoard'

import { expect, test } from '@playwright/test'

import { AttemptRandom } from '@/domain/random'
import { getCatalogLevel } from '@/domain/levels/catalog'
import { getMoveMatch } from '@/domain/boosters/creation'
import { getNeighborKeys } from '@/domain/levels/gravityGeometry'
import { materializeInitialBoard } from '@/domain/levels/materializeInitialBoard'
import { parseCellKey } from '@/domain/levels/coordinates'
import { swapBoardTiles } from '@/domain/board/transitions'

const countStartingMoves = (level: CompiledLevel, board: MaterializedBoard): number => {
  const state = {
    topology: level.topology,
    occupancy: board.map(row => row.map(tile => tile?.kind === 'ordinary' ? tile.type : null)),
  }
  const movable = (row: number, column: number): boolean => {
    const tile = board[row]?.[column]

    return tile?.kind === 'ordinary' && tile.blocker === undefined
  }

  return [...level.topology.playableCells].reduce((count, key) => {
    const from = parseCellKey(key)
    const neighbors = [
      { row: from.row, column: from.column + 1 },
      { row: from.row + 1, column: from.column },
    ]

    return count + neighbors.filter(to => (
      movable(from.row, from.column) && movable(to.row, to.column) &&
      getMoveMatch(swapBoardTiles(state, from, to), to, from).positions.length > 0
    )).length
  }, 0)
}

for (const levelId of [11, 12, 13, 14, 15]) {
  test(`level ${levelId} has a connected field and several starting choices`, () => {
    const level = getCatalogLevel(levelId)
    const connected = new Set([level.topology.playableCells.values().next().value!])

    for (const key of connected) {
      getNeighborKeys(parseCellKey(key)).forEach(([, neighbor]) => {
        if (level.topology.playableCells.has(neighbor)) {
          connected.add(neighbor)
        }
      })
    }
    expect(connected.size).toBe(level.topology.playableCells.size)

    for (let seed = 1; seed <= 50; seed++) {
      const board = materializeInitialBoard(level, new AttemptRandom(seed))
      const minimumChoices = levelId <= 12 ? 5 : 3

      expect(countStartingMoves(level, board), `Level ${levelId}, seed ${seed}`)
        .toBeGreaterThanOrEqual(minimumChoices)
    }
  })
}
