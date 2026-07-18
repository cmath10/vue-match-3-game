import { expect, test } from '@playwright/test'

import {
  getBoosterCreation,
  getCascadeBoosterCreations,
  getMoveMatch,
} from '../../src/entities/Match3BoosterRules'
import type { Board, Position } from '../../src/entities/Match3Engine'
import { findMatchLines } from '../../src/entities/Match3Matches'
import { BOOSTER_TYPE } from '../../src/enums/game'

const parseBoard = (rows: string[]): Board<string> => {
  return rows.map(row => [...row].map(tile => tile === '.' ? null : tile))
}

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
    type: BOOSTER_TYPE.COLUMN_FIRECRACKER,
    position: { row: 1, column: 3 },
  })

  expect(boosterAt([
    '..A..',
    '..A..',
    '..A..',
    '..A..',
  ], { row: 2, column: 2 })).toEqual({
    type: BOOSTER_TYPE.ROW_FIRECRACKER,
    position: { row: 2, column: 2 },
  })
})

test('five tiles create a button box', () => {
  expect(boosterAt([
    '.....',
    'AAAAA',
    '.....',
  ], { row: 1, column: 4 })).toEqual({
    type: BOOSTER_TYPE.BUTTON_BOX,
    position: { row: 1, column: 4 },
  })

  expect(boosterAt([
    '..A..',
    '..A..',
    '..A..',
    '..A..',
    '..A..',
  ], { row: 4, column: 2 })).toEqual({
    type: BOOSTER_TYPE.BUTTON_BOX,
    position: { row: 4, column: 2 },
  })
})

test('intersecting T and L matches create an area kettle', () => {
  expect(boosterAt([
    '.A...',
    'AAA..',
    '.A...',
  ], { row: 1, column: 2 })).toEqual({
    type: BOOSTER_TYPE.AREA_KETTLE,
    position: { row: 1, column: 2 },
  })

  expect(boosterAt([
    'A....',
    'A....',
    'AAA..',
  ], { row: 2, column: 2 })).toEqual({
    type: BOOSTER_TYPE.AREA_KETTLE,
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
    type: BOOSTER_TYPE.AREA_KETTLE,
    position: { row: 1, column: 2 },
  }])
})

test('move creates a kettle from an asymmetric T at the swap origin', () => {
  const match = getMoveMatch(parseBoard([
    '..A...',
    '..A...',
    '.AAAA.',
    '..B...',
  ]), { row: 3, column: 2 }, { row: 2, column: 2 })

  expect(match.positions).toHaveLength(6)
  expect(match.boosters).toEqual([{
    type: BOOSTER_TYPE.AREA_KETTLE,
    position: { row: 3, column: 2 },
  }])
})

test('move creates a box from a vertical five at the swap origin', () => {
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
    type: BOOSTER_TYPE.BUTTON_BOX,
    position: { row: 5, column: 2 },
  }])
})

test('cascade creates a booster at the last causal movement destination', () => {
  const lines = findMatchLines(parseBoard([
    '.....',
    '.AAAA',
    '.....',
  ]))
  const boosters = getCascadeBoosterCreations(lines, [
    { tileId: '10', from: { row: 0, column: 1 }, to: { row: 1, column: 1 }, order: 0 },
    { tileId: '11', from: null, to: { row: 1, column: 3 }, order: 1 },
  ])

  expect(boosters).toEqual([{
    type: BOOSTER_TYPE.COLUMN_FIRECRACKER,
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
    { tileId: '10', from: null, to: { row: 0, column: 0 }, order: 0 },
  ])

  expect(boosters).toEqual([])
})
