import type { MoveMatch, Position, Tile } from '@/domain/types'

import { expect, test } from '@playwright/test'

import { applyBoosterMovePositions } from '@/game/board/boardHits'
import { createMatch3BoosterTurn } from '@/game/turns/boosterTurn'
import TileGrid from '@/game/board/TileGrid'

import { BoosterType, TileType } from '@/domain/enums'

const createTile = (id: number, type: Tile['type'], column: number): Tile => ({
  id,
  type,
  selected: false,
  row: 0,
  column,
})

test('direct activation resolves a complete chain as one turn', async () => {
  const grid = new TileGrid(3, 2)
  const rowFirecracker = createTile(1, BoosterType.RowFirecracker, 0)
  const columnFirecracker = createTile(2, BoosterType.ColumnFirecracker, 2)
  const resolvedPositions: Position[][] = []
  let evaluating = false
  let finishedTurns = 0

  grid.setTile(rowFirecracker, 0, 0)
  grid.setTile(createTile(3, TileType.SweetsFish, 1), 0, 1)
  grid.setTile(columnFirecracker, 0, 2)
  grid.setTile(createTile(4, TileType.SweetsBird, 2), 1, 2)

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
    animateWave: () => Promise.resolve(),
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

test('swiping two identical boosters swaps and activates both in one turn', async () => {
  const grid = new TileGrid(3, 3)
  const firstKettle = createTile(1, BoosterType.AreaKettle, 0)
  const secondKettle = createTile(2, BoosterType.AreaKettle, 1)
  const resolvedPositions: Position[][] = []
  let effectCount = 0
  let finishedTurns = 0

  grid.setTile(firstKettle, 1, 0)
  grid.setTile(secondKettle, 1, 1)
  grid.setTile(createTile(3, TileType.SweetsFish, 2), 1, 2)

  const turn = createMatch3BoosterTurn({
    grid,
    getVersion: () => 1,
    isVersionCurrent: version => version === 1,
    setEvaluating: () => undefined,
    waitAnimation: () => Promise.resolve(),
    settleGrid: () => Promise.resolve(),
    resolvePositions: (positions) => {
      resolvedPositions.push(positions)

      return []
    },
    animateWave: (wave) => {
      effectCount = wave.effects.length

      return Promise.resolve()
    },
    finishTurn: () => finishedTurns++,
    swapTiles: (a, b) => {
      grid.setTile(a, 1, 1)
      grid.setTile(b, 1, 0)
    },
    selectButtonBoxTarget: () => null,
  })

  turn.swipeBooster(firstKettle, secondKettle)

  await expect.poll(() => finishedTurns).toBe(1)
  expect(effectCount).toBe(2)
  expect(resolvedPositions).toHaveLength(1)
  expect(resolvedPositions[0]).toHaveLength(9)
})

test('swiping an ordinary tile into a booster keeps the booster created by the move match', async () => {
  const grid = new TileGrid(5, 1)
  const source = createTile(4, BoosterType.RowFirecracker, 3)
  const target = createTile(5, TileType.SweetsFish, 4)
  let resolvedMatch: MoveMatch | undefined
  let finishedTurns = 0

  grid.setTile(createTile(1, TileType.SweetsFish, 0), 0, 0)
  grid.setTile(createTile(2, TileType.SweetsFish, 1), 0, 1)
  grid.setTile(createTile(3, TileType.SweetsFish, 2), 0, 2)
  grid.setTile(source, 0, 3)
  grid.setTile(target, 0, 4)

  const turn = createMatch3BoosterTurn({
    grid,
    getVersion: () => 1,
    isVersionCurrent: version => version === 1,
    setEvaluating: () => undefined,
    waitAnimation: () => Promise.resolve(),
    settleGrid: () => Promise.resolve(),
    resolvePositions: (positions, match) => {
      resolvedMatch = match
      applyBoosterMovePositions(grid, positions, match, 5, 1, () => undefined)

      return []
    },
    animateWave: () => Promise.resolve(),
    finishTurn: () => finishedTurns++,
    swapTiles: (a, b) => {
      grid.setTile(a, 0, 4)
      grid.setTile(b, 0, 3)
    },
    selectButtonBoxTarget: () => null,
  })

  turn.swipeBooster(source, target)

  await expect.poll(() => finishedTurns).toBe(1)
  expect(resolvedMatch?.boosters).toEqual([{
    type: BoosterType.ColumnFirecracker,
    position: { row: 0, column: 3 },
  }])
  expect(grid.getTileByIndex(0, 3)?.type).toBe(BoosterType.ColumnFirecracker)
  expect(grid.getTileByIndex(0, 4)).toBeNull()
})
