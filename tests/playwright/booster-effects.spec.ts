import type { Board } from '@/entities/Match3Engine'

import type { BoardTileType } from '@/enums/game'

import { expect, test } from '@playwright/test'

import {
  getBoosterEffect,
  getButtonBoxEffect,
  getPresentTileTypes,
} from '@/entities/Match3BoosterEffects'

import { BOOSTER_TYPE, SPECIAL_TILE_TYPE, TILE_TYPE } from '@/enums/game'

test('row and column firecrackers cover their full lines', () => {
  expect(getBoosterEffect(
    BOOSTER_TYPE.ROW_FIRECRACKER,
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
    BOOSTER_TYPE.COLUMN_FIRECRACKER,
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
    BOOSTER_TYPE.AREA_KETTLE,
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
    [TILE_TYPE.SWEETS_FISH, SPECIAL_TILE_TYPE.MUG, TILE_TYPE.SWEETS_FISH],
    [BOOSTER_TYPE.BUTTON_BOX, SPECIAL_TILE_TYPE.COOKIE, TILE_TYPE.SWEETS_BIRD],
  ]
  const effect = getButtonBoxEffect(board, { row: 1, column: 0 }, TILE_TYPE.SWEETS_FISH)

  expect(effect.positions).toEqual([
    { row: 1, column: 0 },
    { row: 0, column: 0 },
    { row: 0, column: 2 },
  ])
  expect(getPresentTileTypes(board)).toEqual([
    TILE_TYPE.SWEETS_FISH,
    TILE_TYPE.SWEETS_BIRD,
  ])
})
