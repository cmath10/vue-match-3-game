import type { Counter, Tile } from '../../src/types/game'

import type { BoardTileType, ObjectiveType } from '../../src/enums/game'

import { expect, test } from '@playwright/test'

import { applyBoosterEffectPositions } from '../../src/entities/Match3BoardHits'

import { BOOSTER_TYPE, SPECIAL_TILE_TYPE, TILE_TYPE } from '../../src/enums/game'
import TileGrid from '../../src/entities/TileGrid'

const createTile = (id: number, type: BoardTileType, row: number, column: number): Tile => ({
  id,
  type,
  selected: false,
  row,
  column,
})

test('effect wave applies blockers, cookies, counters and boosters once', () => {
  const grid = new TileGrid(4, 2)
  const packaged = createTile(1, TILE_TYPE.SWEETS_FISH, 0, 0)
  const ordinary = createTile(2, TILE_TYPE.SWEETS_BIRD, 0, 1)
  const cookie = createTile(3, SPECIAL_TILE_TYPE.COOKIE, 1, 1)
  const booster = createTile(4, BOOSTER_TYPE.AREA_KETTLE, 0, 2)
  const counters: Counter[] = []
  const incrementCounter = (type: ObjectiveType) => {
    const counter = counters.find(item => item.type === type)

    if (counter === undefined) {
      counters.push({ type, count: 1 })
    } else {
      counter.count++
    }
  }

  packaged.blocker = { type: SPECIAL_TILE_TYPE.PACKAGE, health: 1 }
  cookie.health = 3
  grid.setTile(packaged, 0, 0)
  grid.setTile(ordinary, 0, 1)
  grid.setTile(cookie, 1, 1)
  grid.setTile(booster, 0, 2)

  applyBoosterEffectPositions(grid, [
    { row: 0, column: 0 },
    { row: 0, column: 1 },
    { row: 1, column: 1 },
    { row: 0, column: 2 },
  ], 4, 2, incrementCounter)

  expect(grid.getTileByIndex(0, 0)).toBe(packaged)
  expect(packaged.blocker).toBeUndefined()
  expect(grid.getTileByIndex(0, 1)).toBeNull()
  expect(grid.getTileByIndex(0, 2)).toBeNull()
  expect(cookie.health).toBe(2)
  expect(counters).toEqual(expect.arrayContaining([
    { type: SPECIAL_TILE_TYPE.PACKAGE, count: 1 },
    { type: TILE_TYPE.SWEETS_BIRD, count: 1 },
  ]))
})
