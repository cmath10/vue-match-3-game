/// <reference types="node" />

import type { Board, Position } from '@/domain/types'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, test } from '@playwright/test'

import { applyMove } from '@/entities/Engine'

type TileCounts = Record<string, number>
type MoveFixture = {
  from: [number, number]
  to: [number, number]
}
type BoardStateFixture = {
  name: string
  board: string[]
  move: MoveFixture
  refill: string
  expected: {
    accepted: boolean
    board: string[]
    cleared: TileCounts
    cascades: number
  }
}
type BoardStatesFixture = {
  schemaVersion: number
  width: number
  height: number
  cases: BoardStateFixture[]
}

const fixture = JSON.parse(readFileSync(
  resolve(process.cwd(), 'tests/fixtures/board-states/cases.json'),
  'utf8'
)) as BoardStatesFixture

const parseBoard = (rows: string[]): Board<string> => {
  return rows.map(row => row.split(''))
}

const serializeBoard = (board: Board<string>): string[] => {
  return board.map(row => row.join(''))
}

const parsePosition = ([row, column]: [number, number]): Position => {
  return { row, column }
}

const countTiles = (tiles: string[]): TileCounts => {
  return tiles.reduce<TileCounts>((counts, tile) => {
    counts[tile] = (counts[tile] ?? 0) + 1

    return counts
  }, {})
}

test.describe('board state transitions', () => {
  fixture.cases.forEach((state) => {
    test(state.name, () => {
      const result = applyMove(
        parseBoard(state.board),
        parsePosition(state.move.from),
        parsePosition(state.move.to),
        state.refill.split('')
      )

      expect(result.accepted).toBe(state.expected.accepted)
      expect(serializeBoard(result.board)).toEqual(state.expected.board)
      expect(countTiles(result.cleared)).toEqual(state.expected.cleared)
      expect(result.cascades).toBe(state.expected.cascades)
    })
  })
})

test('unrelated existing matches do not make a move accepted', () => {
  const board = parseBoard([
    'ABCDEABC',
    'BCDEABCD',
    'CDEABCDE',
    'DEABCDEA',
    'EABCDEAB',
    'ABCDEABC',
    'BCDEABCD',
    'AAADEABC',
  ])

  const result = applyMove(board, { row: 0, column: 0 }, { row: 0, column: 1 }, 'ABCDE'.split(''))

  expect(result.accepted).toBe(false)
  expect(serializeBoard(result.board)).toEqual(serializeBoard(board))
  expect(result.cleared).toEqual([])
})
