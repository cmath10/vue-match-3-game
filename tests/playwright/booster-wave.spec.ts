import type { Board } from '@/domain/types'

import type { BoardTileType } from '@/domain/enums'

import { expect, test } from '@playwright/test'

import { createRectangularBoardState } from '@/domain/board/topology'
import { getBoosterSwipe } from '@/domain/boosters/combinations'
import { resolveBoosterWave } from '@/domain/boosters/chain'

import {
  BoosterCombinationType,
  BoosterType,
  SpecialTileType,
  TileType,
} from '@/domain/enums'

test('booster wave activates each hit booster once and deduplicates positions', () => {
  const board: Board<BoardTileType> = [
    [TileType.SweetsFish, TileType.SweetsBird, TileType.SweetsPillow, TileType.SweetsFish],
    [TileType.SweetsBird, BoosterType.RowFirecracker, TileType.SweetsFish, BoosterType.ColumnFirecracker],
    [TileType.SweetsFish, TileType.SweetsPillow, TileType.SweetsBird, BoosterType.AreaKettle],
    [TileType.SweetsPillow, TileType.SweetsFish, TileType.SweetsBird, TileType.SweetsRooster],
  ]
  const wave = resolveBoosterWave(
    createRectangularBoardState(board),
    [{ source: { row: 1, column: 1 } }],
    () => null
  )

  expect(wave.effects.map(effect => ({
    booster: effect.booster,
    source: effect.source,
  }))).toEqual([
    { booster: BoosterType.RowFirecracker, source: { row: 1, column: 1 } },
    { booster: BoosterType.ColumnFirecracker, source: { row: 1, column: 3 } },
    { booster: BoosterType.AreaKettle, source: { row: 2, column: 3 } },
  ])
  expect(new Set(wave.positions.map(({ row, column }) => `${row}-${column}`)).size)
    .toBe(wave.positions.length)
})

test('chain-activated button box selects only types currently present on board', () => {
  const board: Board<BoardTileType> = [
    [BoosterType.RowFirecracker, BoosterType.ButtonBox, TileType.SweetsFish],
    [TileType.SweetsBird, TileType.SweetsFish, TileType.SweetsFish],
  ]
  const selections: TileType[][] = []
  const wave = resolveBoosterWave(
    createRectangularBoardState(board),
    [{ source: { row: 0, column: 0 } }],
    (types) => {
      selections.push(types)

      return TileType.SweetsFish
    }
  )

  expect(selections).toEqual([[
    TileType.SweetsFish,
    TileType.SweetsBird,
  ]])
  expect(wave.effects[1]).toMatchObject({
    booster: BoosterType.ButtonBox,
    targetType: TileType.SweetsFish,
  })
  expect(wave.positions).toEqual(expect.arrayContaining([
    { row: 0, column: 1 },
    { row: 0, column: 2 },
    { row: 1, column: 1 },
    { row: 1, column: 2 },
  ]))
})

test('button box is still consumed when no ordinary tile type is present', () => {
  const board: Board<BoardTileType> = [[BoosterType.ButtonBox]]
  const wave = resolveBoosterWave(
    createRectangularBoardState(board),
    [{ source: { row: 0, column: 0 } }],
    types => types[0] ?? null
  )

  expect(wave.positions).toEqual([{ row: 0, column: 0 }])
  expect(wave.effects[0].targetType).toBeUndefined()
})

test('button box swipe carries the selected ordinary type to its destination', () => {
  expect(getBoosterSwipe(
    BoosterType.ButtonBox,
    TileType.SweetsRooster,
    { row: 1, column: 2 },
    { row: 1, column: 1 }
  )).toEqual({
    activations: [{
      source: { row: 1, column: 2 },
      targetType: TileType.SweetsRooster,
    }],
    combination: null,
  })
})

test('a swiped kettle and firecracker form a combination at the source destination', () => {
  expect(getBoosterSwipe(
    BoosterType.AreaKettle,
    BoosterType.RowFirecracker,
    { row: 2, column: 3 },
    { row: 2, column: 2 }
  )).toEqual({
    activations: [],
    combination: {
      type: BoosterCombinationType.KettleFirecracker,
      source: { row: 2, column: 3 },
      participants: [{ row: 2, column: 3 }, { row: 2, column: 2 }],
      boosters: [BoosterType.AreaKettle, BoosterType.RowFirecracker],
    },
  })
})

test('two kettles keep their two base activations until their combination is defined', () => {
  expect(getBoosterSwipe(
    BoosterType.AreaKettle,
    BoosterType.AreaKettle,
    { row: 2, column: 3 },
    { row: 2, column: 2 }
  )).toEqual({
    activations: [
      { source: { row: 2, column: 3 } },
      { source: { row: 2, column: 2 } },
    ],
    combination: null,
  })
})

test('button box uses random selection when swiped with a special object', () => {
  expect(getBoosterSwipe(
    BoosterType.ButtonBox,
    SpecialTileType.Cookie,
    { row: 0, column: 1 },
    { row: 0, column: 0 }
  )).toEqual({
    activations: [{ source: { row: 0, column: 1 } }],
    combination: null,
  })
})
