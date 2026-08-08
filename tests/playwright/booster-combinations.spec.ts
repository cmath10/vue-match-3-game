import type { Board } from '@/domain/types'

import type { BoardTileType } from '@/domain/enums'

import { expect, test } from '@playwright/test'

import { resolveBoosterWave } from '@/domain/boosters/chain'

import { BoosterCombinationType, BoosterType, TileType } from '@/domain/enums'

const createBoard = (size: number): Board<BoardTileType> => Array.from(
  { length: size },
  () => Array.from({ length: size }, () => TileType.SweetsFish)
)

test('two firecrackers combine into one row and one column at the swipe destination', () => {
  const board = createBoard(5)

  board[2][2] = BoosterType.RowFirecracker
  board[2][3] = BoosterType.ColumnFirecracker

  const wave = resolveBoosterWave(board, [], () => null, {
    type: BoosterCombinationType.CrossFirecrackers,
    source: { row: 2, column: 3 },
    participants: [{ row: 2, column: 2 }, { row: 2, column: 3 }],
    boosters: [BoosterType.RowFirecracker, BoosterType.ColumnFirecracker],
  })

  expect(wave.effects.map(effect => effect.booster)).toEqual([
    BoosterType.RowFirecracker,
    BoosterType.ColumnFirecracker,
  ])
  expect(wave.positions).toHaveLength(9)
})

test('a kettle and firecracker combine into three rows and three columns', () => {
  const board = createBoard(7)

  board[3][3] = BoosterType.AreaKettle
  board[3][4] = BoosterType.RowFirecracker

  const wave = resolveBoosterWave(board, [], () => null, {
    type: BoosterCombinationType.KettleFirecracker,
    source: { row: 3, column: 3 },
    participants: [{ row: 3, column: 3 }, { row: 3, column: 4 }],
    boosters: [BoosterType.AreaKettle, BoosterType.RowFirecracker],
  })

  expect(wave.effects.map(effect => effect.booster)).toEqual([
    BoosterType.RowFirecracker,
    BoosterType.RowFirecracker,
    BoosterType.RowFirecracker,
    BoosterType.ColumnFirecracker,
    BoosterType.ColumnFirecracker,
    BoosterType.ColumnFirecracker,
  ])
  expect(wave.positions).toHaveLength(33)
})
