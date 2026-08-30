import type { Board } from '@/domain/types'

import type { BoardTileType } from '@/domain/enums'

import { expect, test } from '@playwright/test'

import { createRectangularTopology } from '@/domain/board/topology'
import {
  getBoosterEffect,
  getButtonBoxEffect,
  getPresentTileTypes,
} from '@/domain/boosters/effects'

import { BoosterType, SpecialTileType, TileType } from '@/domain/enums'

test('row and column firecrackers cover their full lines', () => {
  expect(getBoosterEffect(
    BoosterType.RowFirecracker,
    { row: 2, column: 3 },
    createRectangularTopology(5, 4)
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
    createRectangularTopology(5, 4)
  ).positions).toEqual([
    { row: 0, column: 3 },
    { row: 1, column: 3 },
    { row: 2, column: 3 },
    { row: 3, column: 3 },
  ])
})

test('kettle covers a 5 by 5 circle without the four zone corners', () => {
  expect(getBoosterEffect(
    BoosterType.AreaKettle,
    { row: 2, column: 2 },
    createRectangularTopology(5, 5)
  ).positions).toEqual([
    { row: 0, column: 1 },
    { row: 0, column: 2 },
    { row: 0, column: 3 },
    { row: 1, column: 0 },
    { row: 1, column: 1 },
    { row: 1, column: 2 },
    { row: 1, column: 3 },
    { row: 1, column: 4 },
    { row: 2, column: 0 },
    { row: 2, column: 1 },
    { row: 2, column: 2 },
    { row: 2, column: 3 },
    { row: 2, column: 4 },
    { row: 3, column: 0 },
    { row: 3, column: 1 },
    { row: 3, column: 2 },
    { row: 3, column: 3 },
    { row: 3, column: 4 },
    { row: 4, column: 1 },
    { row: 4, column: 2 },
    { row: 4, column: 3 },
  ])
})

test('kettle circle is clipped at board edges', () => {
  expect(getBoosterEffect(
    BoosterType.AreaKettle,
    { row: 0, column: 0 },
    createRectangularTopology(5, 4)
  ).positions).toEqual([
    { row: 0, column: 0 },
    { row: 0, column: 1 },
    { row: 0, column: 2 },
    { row: 1, column: 0 },
    { row: 1, column: 1 },
    { row: 1, column: 2 },
    { row: 2, column: 0 },
    { row: 2, column: 1 },
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
