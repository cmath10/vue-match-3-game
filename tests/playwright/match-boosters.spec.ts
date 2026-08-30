import type { BoardState, Position } from '@/domain/types'

import { expect, test } from '@playwright/test'

import {
  getBoosterCreation,
  getCascadeBoosterCreations,
  getMoveMatch,
} from '@/domain/boosters/creation'

import { BoosterType } from '@/domain/enums'
import { createRectangularBoardState } from '@/domain/board/topology'
import { findMatchLines } from '@/domain/board/matches'

const parseBoard = (rows: string[]): BoardState<string> => createRectangularBoardState(
  rows.map(row => [...row].map(tile => tile === '.' ? null : tile))
)

const boosterAt = (rows: string[], position: Position) => {
  return getBoosterCreation(findMatchLines(parseBoard(rows)), position)
}

test('structured matches preserve type, orientation and positions', () => {
  const lines = findMatchLines(parseBoard([
    '.....',
    '.AAAA',
    '..B..',
  ]))

  expect(lines).toEqual([{
    type: 'A',
    orientation: 'row',
    positions: [
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 1, column: 3 },
      { row: 1, column: 4 },
    ],
  }])
})

test('four tiles create a firecracker opposite to match orientation', () => {
  expect(boosterAt([
    '.....',
    '.AAAA',
    '.....',
  ], { row: 1, column: 3 })).toEqual({
    type: BoosterType.ColumnFirecracker,
    position: { row: 1, column: 3 },
  })

  expect(boosterAt([
    '..A..',
    '..A..',
    '..A..',
    '..A..',
  ], { row: 2, column: 2 })).toEqual({
    type: BoosterType.RowFirecracker,
    position: { row: 2, column: 2 },
  })
})

test('five tiles create a button box', () => {
  expect(boosterAt([
    '.....',
    'AAAAA',
    '.....',
  ], { row: 1, column: 4 })).toEqual({
    type: BoosterType.ButtonBox,
    position: { row: 1, column: 4 },
  })

  expect(boosterAt([
    '..A..',
    '..A..',
    '..A..',
    '..A..',
    '..A..',
  ], { row: 4, column: 2 })).toEqual({
    type: BoosterType.ButtonBox,
    position: { row: 4, column: 2 },
  })
})

test('intersecting T and L matches create an area kettle', () => {
  expect(boosterAt([
    '.A...',
    'AAA..',
    '.A...',
  ], { row: 1, column: 2 })).toEqual({
    type: BoosterType.AreaKettle,
    position: { row: 1, column: 2 },
  })

  expect(boosterAt([
    'A....',
    'A....',
    'AAA..',
  ], { row: 2, column: 2 })).toEqual({
    type: BoosterType.AreaKettle,
    position: { row: 2, column: 2 },
  })
})

test('ordinary match does not create a booster', () => {
  expect(boosterAt([
    '.....',
    '.AAA.',
    '.....',
  ], { row: 1, column: 2 })).toBeNull()
})

test('move match includes the connected arm of a T shape', () => {
  const match = getMoveMatch(parseBoard([
    '.A...',
    'AAA..',
    '.A...',
  ]), { row: 1, column: 2 }, { row: 1, column: 3 })

  expect(match.positions).toHaveLength(5)
  expect(match.boosters).toEqual([{
    type: BoosterType.AreaKettle,
    position: { row: 1, column: 2 },
  }])
})

test('move creates a kettle at the swap destination inside an asymmetric T', () => {
  const match = getMoveMatch(parseBoard([
    '..A...',
    '..A...',
    '.AAAA.',
    '..B...',
  ]), { row: 3, column: 2 }, { row: 2, column: 2 })

  expect(match.positions).toHaveLength(6)
  expect(match.boosters).toEqual([{
    type: BoosterType.AreaKettle,
    position: { row: 2, column: 2 },
  }])
})

test('move creates a box at the swap destination inside a vertical five', () => {
  const match = getMoveMatch(parseBoard([
    '..A..',
    '..A..',
    '..A..',
    '..A..',
    '..A..',
    '..B..',
  ]), { row: 5, column: 2 }, { row: 4, column: 2 })

  expect(match.positions).toHaveLength(5)
  expect(match.boosters).toEqual([{
    type: BoosterType.ButtonBox,
    position: { row: 4, column: 2 },
  }])
})

test('special tile at the other swap destination does not suppress a created booster', () => {
  const match = getMoveMatch(parseBoard([
    '..A...',
    '..A...',
    '.AAAA.',
    '......',
  ]), { row: 3, column: 2 }, { row: 2, column: 2 })

  expect(match.positions).toHaveLength(6)
  expect(match.boosters).toEqual([{
    type: BoosterType.AreaKettle,
    position: { row: 2, column: 2 },
  }])
})

test('move creates a booster for each independently matched swap destination', () => {
  const match = getMoveMatch(parseBoard([
    '.AAAA.',
    '.BBBB.',
  ]), { row: 0, column: 2 }, { row: 1, column: 2 })

  expect(match.positions).toHaveLength(8)
  expect(match.boosters).toEqual([
    {
      type: BoosterType.ColumnFirecracker,
      position: { row: 0, column: 2 },
    },
    {
      type: BoosterType.ColumnFirecracker,
      position: { row: 1, column: 2 },
    },
  ])
})

test('cascade creates a booster at the last causal movement destination', () => {
  const lines = findMatchLines(parseBoard([
    '.....',
    '.AAAA',
    '.....',
  ]))
  const boosters = getCascadeBoosterCreations(lines, [
    {
      tileId: '10',
      origin: { kind: 'cell', position: { row: 0, column: 1 } },
      path: [{ row: 1, column: 1 }],
      phase: 0,
      resolutionOrder: 0,
    },
    {
      tileId: '11',
      origin: { kind: 'spawn', spawnId: 'test' },
      path: [{ row: 1, column: 3 }],
      phase: 0,
      resolutionOrder: 1,
    },
  ])

  expect(boosters).toEqual([{
    type: BoosterType.ColumnFirecracker,
    position: { row: 1, column: 3 },
  }])
})

test('cascade does not create a booster without a movement in its match', () => {
  const lines = findMatchLines(parseBoard([
    '.....',
    '.AAAA',
    '.....',
  ]))
  const boosters = getCascadeBoosterCreations(lines, [
    {
      tileId: '10',
      origin: { kind: 'spawn', spawnId: 'test' },
      path: [{ row: 0, column: 0 }],
      phase: 0,
      resolutionOrder: 0,
    },
  ])

  expect(boosters).toEqual([])
})
