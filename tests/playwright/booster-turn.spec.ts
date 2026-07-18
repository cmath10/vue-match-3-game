import { expect, test } from '@playwright/test'

import { createMatch3BoosterTurn } from '../../src/entities/Match3BoosterTurn'
import TileGrid from '../../src/entities/TileGrid'
import type { Position } from '../../src/entities/Match3Engine'
import { BOOSTER_TYPE, TILE_TYPE } from '../../src/enums/game'
import type { Tile } from '../../src/types/game'

const createTile = (id: number, type: Tile['type'], column: number): Tile => ({
  id,
  type,
  selected: false,
  row: 0,
  column,
})

test('direct activation resolves a complete chain as one turn', async () => {
  const grid = new TileGrid(3, 2)
  const rowFirecracker = createTile(1, BOOSTER_TYPE.ROW_FIRECRACKER, 0)
  const columnFirecracker = createTile(2, BOOSTER_TYPE.COLUMN_FIRECRACKER, 2)
  const resolvedPositions: Position[][] = []
  let evaluating = false
  let finishedTurns = 0

  grid.setTile(rowFirecracker, 0, 0)
  grid.setTile(createTile(3, TILE_TYPE.SWEETS_FISH, 1), 0, 1)
  grid.setTile(columnFirecracker, 0, 2)
  grid.setTile(createTile(4, TILE_TYPE.SWEETS_BIRD, 2), 1, 2)

  const turn = createMatch3BoosterTurn({
    grid,
    getVersion: () => 1,
    isVersionCurrent: version => version === 1,
    setEvaluating: value => evaluating = value,
    waitAnimation: () => Promise.resolve(),
    settleGrid: () => Promise.resolve(),
    resolvePositions: (positions) => {
      resolvedPositions.push(positions)

      return []
    },
    finishTurn: () => {
      finishedTurns++
      evaluating = false
    },
    swapTiles: () => undefined,
    selectButtonBoxTarget: () => null,
  })

  turn.activateBooster(rowFirecracker)

  await expect.poll(() => finishedTurns).toBe(1)
  expect(evaluating).toBe(false)
  expect(resolvedPositions).toHaveLength(1)
  expect(resolvedPositions[0]).toEqual(expect.arrayContaining([
    { row: 0, column: 0 },
    { row: 0, column: 2 },
    { row: 1, column: 2 },
  ]))
})
