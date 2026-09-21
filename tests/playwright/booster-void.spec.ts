import type { BoardState } from '@/domain/types'
import type { BoardTileType } from '@/domain/enums'
import type { BoardTopology } from '@/domain/levels/types'
import type { Position } from '@/domain/types'

import { expect, test } from '@playwright/test'

import { BoosterType } from '@/domain/enums'
import { createRectangularTopology } from '@/domain/board/topology'
import { getBoosterEffect } from '@/domain/boosters/effects'
import { getBoosterSwipe } from '@/domain/boosters/combinations'
import { getCatalogLevel } from '@/domain/levels/catalog'
import { getCellKey } from '@/domain/levels/coordinates'
import { getLevelIds } from '@/domain/progress'
import { parseCellKey } from '@/domain/levels/coordinates'
import { resolveBoosterWave } from '@/domain/boosters/chain'
import { TileType } from '@/domain/enums'

const RECTANGLE = createRectangularTopology(7, 7)
const TOPOLOGY: BoardTopology = {
  bounds: RECTANGLE.bounds,
  playableCells: new Set([...RECTANGLE.playableCells].filter(key => {
    const { row, column } = parseCellKey(key)

    return row !== 2 && row !== 4 && !(row === 3 && column === 2)
  })),
}
const SOURCE = { row: 3, column: 3 }
const TARGET = { row: 3, column: 4 }
const BOOSTERS = Object.values(BoosterType)
const GEOMETRIC_BOOSTERS = [
  BoosterType.RowFirecracker, BoosterType.ColumnFirecracker, BoosterType.AreaKettle,
] as const

const createState = (topology: BoardTopology): BoardState<BoardTileType> => ({
  topology,
  occupancy: Array.from({ length: topology.bounds.height }, (_, row) => (
    Array.from({ length: topology.bounds.width }, (__, column) => (
      topology.playableCells.has(getCellKey({ row, column })) ? TileType.SweetsFish : null
    ))
  )),
})

const playableKeys = (positions: Position[], topology = TOPOLOGY): string[] => (
  positions.map(getCellKey).filter(key => topology.playableCells.has(key)).sort()
)

for (const booster of BOOSTERS) {
  test(`${booster} reaches disconnected cells in its footprint`, () => {
    const resolve = (topology: BoardTopology) => {
      const state = createState(topology)

      state.occupancy[SOURCE.row][SOURCE.column] = booster
      return resolveBoosterWave(state, [{ source: SOURCE }], () => TileType.SweetsFish)
    }
    const wave = resolve(TOPOLOGY)

    expect(wave.positions.map(getCellKey).sort()).toEqual(playableKeys(resolve(RECTANGLE).positions))
    expect(wave.activatedBoosters).toEqual([booster])
  })
}

for (const sourceType of BOOSTERS) {
  for (const targetType of BOOSTERS) {
    test(`${sourceType} with ${targetType} keeps its full footprint across void`, () => {
      const swipe = getBoosterSwipe(sourceType, targetType, SOURCE, TARGET)!
      const resolve = (topology: BoardTopology) => {
        const state = createState(topology)

        state.occupancy[SOURCE.row][SOURCE.column] = sourceType
        state.occupancy[TARGET.row][TARGET.column] = targetType
        return resolveBoosterWave(state, swipe.activations, () => TileType.SweetsFish, swipe.combination)
      }
      const wave = resolve(TOPOLOGY)
      const uninterrupted = resolve(RECTANGLE)

      expect(wave.positions.map(getCellKey).sort()).toEqual(playableKeys(uninterrupted.positions))
      expect(wave.activatedBoosters).toEqual(uninterrupted.activatedBoosters)
      expect(new Set(wave.positions.map(getCellKey)).size).toBe(wave.positions.length)
    })
  }
}

test('a chain activates all four booster types across holes exactly once', () => {
  const state = createState(TOPOLOGY)

  state.occupancy[3][0] = BoosterType.RowFirecracker
  state.occupancy[3][3] = BoosterType.ColumnFirecracker
  state.occupancy[5][3] = BoosterType.AreaKettle
  state.occupancy[5][5] = BoosterType.ButtonBox
  const wave = resolveBoosterWave(state, [{ source: { row: 3, column: 0 } }], () => TileType.SweetsFish)

  expect(wave.activatedBoosters).toEqual(BOOSTERS)
  expect(new Set(wave.positions.map(getCellKey))).toEqual(TOPOLOGY.playableCells)
  expect(wave.positions).toHaveLength(TOPOLOGY.playableCells.size)
})

for (const levelId of getLevelIds()) {
  test(`level ${levelId} holes never truncate booster geometry`, () => {
    const { topology } = getCatalogLevel(levelId)
    const rectangle = createRectangularTopology(topology.bounds.width, topology.bounds.height)
    const scenarios = [...topology.playableCells].flatMap(key => (
      GEOMETRIC_BOOSTERS.map(booster => ({ booster, source: parseCellKey(key) }))
    ))

    for (const { booster, source } of scenarios) {
      const effect = getBoosterEffect(booster, source, topology)
      const uninterrupted = getBoosterEffect(booster, source, rectangle)

      expect(effect.positions.map(getCellKey).sort(), `${booster} at ${getCellKey(source)}`)
        .toEqual(playableKeys(uninterrupted.positions, topology))
    }
  })
}
