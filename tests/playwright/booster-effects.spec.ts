import type { Board } from '@/domain/types'

import type { BoardTileType } from '@/domain/enums'

import { expect, test } from '@playwright/test'

import {
  getBoosterEffect,
  getButtonBoxEffect,
  getPresentTileTypes,
} from '@/entities/BoosterEffects'

import { BoosterType, SpecialTileType, TileType } from '@/domain/enums'

test('row and column firecrackers cover their full lines', () => {
  expect(getBoosterEffect(
    BoosterType.RowFirecracker,
    { row: 2, column: 3 },
    5,
    4
  ).positions).toEqual([
    { row: 2, column: 0 },
    { row: 2, column: 1 },
    { row: 2, column: 2 },
    { row: 2, column: 3 },
    { row: 2, column: 4 },
  ])

  expect(getBoosterEffect(
    BoosterType.ColumnFirecracker,
    { row: 2, column: 3 },
    5,
    4
  ).positions).toEqual([
    { row: 0, column: 3 },
    { row: 1, column: 3 },
    { row: 2, column: 3 },
    { row: 3, column: 3 },
  ])
})

test('kettle has a clipped 3 by 3 area at board edges', () => {
  expect(getBoosterEffect(
    BoosterType.AreaKettle,
    { row: 0, column: 0 },
    5,
    4
  ).positions).toEqual([
    { row: 0, column: 0 },
    { row: 0, column: 1 },
    { row: 1, column: 0 },
    { row: 1, column: 1 },
  ])
})

test('button box targets only the selected ordinary tile type and its source', () => {
  const board: Board<BoardTileType> = [
    [TileType.SweetsFish, SpecialTileType.Mug, TileType.SweetsFish],
    [BoosterType.ButtonBox, SpecialTileType.Cookie, TileType.SweetsBird],
  ]
  const effect = getButtonBoxEffect(board, { row: 1, column: 0 }, TileType.SweetsFish)

  expect(effect.positions).toEqual([
    { row: 1, column: 0 },
    { row: 0, column: 0 },
    { row: 0, column: 2 },
  ])
  expect(getPresentTileTypes(board)).toEqual([
    TileType.SweetsFish,
    TileType.SweetsBird,
  ])
})
