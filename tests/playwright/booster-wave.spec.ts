import type { Board } from '../../src/entities/Match3Engine'

import type { BoardTileType } from '../../src/enums/game'

import { expect, test } from '@playwright/test'

import {
  getBoosterSwipeActivations,
  resolveBoosterWave,
} from '../../src/entities/Match3BoosterWave'

import { BOOSTER_TYPE, SPECIAL_TILE_TYPE, TILE_TYPE } from '../../src/enums/game'

test('booster wave activates each hit booster once and deduplicates positions', () => {
  const board: Board<BoardTileType> = [
    [TILE_TYPE.SWEETS_FISH, TILE_TYPE.SWEETS_BIRD, TILE_TYPE.SWEETS_PILLOW, TILE_TYPE.SWEETS_FISH],
    [TILE_TYPE.SWEETS_BIRD, BOOSTER_TYPE.ROW_FIRECRACKER, TILE_TYPE.SWEETS_FISH, BOOSTER_TYPE.COLUMN_FIRECRACKER],
    [TILE_TYPE.SWEETS_FISH, TILE_TYPE.SWEETS_PILLOW, TILE_TYPE.SWEETS_BIRD, BOOSTER_TYPE.AREA_KETTLE],
    [TILE_TYPE.SWEETS_PILLOW, TILE_TYPE.SWEETS_FISH, TILE_TYPE.SWEETS_BIRD, TILE_TYPE.SWEETS_ROOSTER],
  ]
  const wave = resolveBoosterWave(
    board,
    [{ source: { row: 1, column: 1 } }],
    () => null
  )

  expect(wave.effects.map(effect => ({
    booster: effect.booster,
    source: effect.source,
  }))).toEqual([
    { booster: BOOSTER_TYPE.ROW_FIRECRACKER, source: { row: 1, column: 1 } },
    { booster: BOOSTER_TYPE.COLUMN_FIRECRACKER, source: { row: 1, column: 3 } },
    { booster: BOOSTER_TYPE.AREA_KETTLE, source: { row: 2, column: 3 } },
  ])
  expect(new Set(wave.positions.map(({ row, column }) => `${row}-${column}`)).size)
    .toBe(wave.positions.length)
})

test('chain-activated button box selects only types currently present on board', () => {
  const board: Board<BoardTileType> = [
    [BOOSTER_TYPE.ROW_FIRECRACKER, BOOSTER_TYPE.BUTTON_BOX, TILE_TYPE.SWEETS_FISH],
    [TILE_TYPE.SWEETS_BIRD, TILE_TYPE.SWEETS_FISH, TILE_TYPE.SWEETS_FISH],
  ]
  const selections: TILE_TYPE[][] = []
  const wave = resolveBoosterWave(
    board,
    [{ source: { row: 0, column: 0 } }],
    (types) => {
      selections.push(types)

      return TILE_TYPE.SWEETS_FISH
    }
  )

  expect(selections).toEqual([[
    TILE_TYPE.SWEETS_FISH,
    TILE_TYPE.SWEETS_BIRD,
  ]])
  expect(wave.effects[1]).toMatchObject({
    booster: BOOSTER_TYPE.BUTTON_BOX,
    targetType: TILE_TYPE.SWEETS_FISH,
  })
  expect(wave.positions).toEqual(expect.arrayContaining([
    { row: 0, column: 1 },
    { row: 0, column: 2 },
    { row: 1, column: 1 },
    { row: 1, column: 2 },
  ]))
})

test('button box is still consumed when no ordinary tile type is present', () => {
  const board: Board<BoardTileType> = [[BOOSTER_TYPE.BUTTON_BOX]]
  const wave = resolveBoosterWave(
    board,
    [{ source: { row: 0, column: 0 } }],
    types => types[0] ?? null
  )

  expect(wave.positions).toEqual([{ row: 0, column: 0 }])
  expect(wave.effects[0].targetType).toBeUndefined()
})

test('button box swipe carries the selected ordinary type to its destination', () => {
  expect(getBoosterSwipeActivations(
    BOOSTER_TYPE.BUTTON_BOX,
    TILE_TYPE.SWEETS_ROOSTER,
    { row: 1, column: 2 },
    { row: 1, column: 1 }
  )).toEqual([{
    source: { row: 1, column: 2 },
    targetType: TILE_TYPE.SWEETS_ROOSTER,
  }])
})

test('two swiped boosters activate from both swapped destinations', () => {
  expect(getBoosterSwipeActivations(
    BOOSTER_TYPE.AREA_KETTLE,
    BOOSTER_TYPE.ROW_FIRECRACKER,
    { row: 2, column: 3 },
    { row: 2, column: 2 }
  )).toEqual([
    { source: { row: 2, column: 3 } },
    { source: { row: 2, column: 2 } },
  ])
})

test('two identical swiped boosters activate from both swapped destinations', () => {
  expect(getBoosterSwipeActivations(
    BOOSTER_TYPE.AREA_KETTLE,
    BOOSTER_TYPE.AREA_KETTLE,
    { row: 2, column: 3 },
    { row: 2, column: 2 }
  )).toEqual([
    { source: { row: 2, column: 3 } },
    { source: { row: 2, column: 2 } },
  ])
})

test('button box uses random selection when swiped with a special object', () => {
  expect(getBoosterSwipeActivations(
    BOOSTER_TYPE.BUTTON_BOX,
    SPECIAL_TILE_TYPE.COOKIE,
    { row: 0, column: 1 },
    { row: 0, column: 0 }
  )).toEqual([{
    source: { row: 0, column: 1 },
  }])
})
