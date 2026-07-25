import type { Position, Tile } from '@/domain/types'

import { expect, test } from '@playwright/test'

import { createMatch3BoosterTurn } from '@/entities/BoosterTurn'
import TileGrid from '@/entities/TileGrid'

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
