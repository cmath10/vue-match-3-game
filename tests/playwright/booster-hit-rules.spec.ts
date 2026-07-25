import type { BoardTileType } from '@/domain/enums'
import type { Counter, ObjectiveCollection, Tile } from '@/domain/types'

import { expect, test } from '@playwright/test'

import { applyBoosterEffectPositions } from '@/entities/BoardHits'

import { BoosterType, SpecialTileType } from '@/domain/enums'
import TileGrid from '@/entities/TileGrid'
import { TileType } from '@/domain/enums'

const createTile = (id: number, type: BoardTileType, row: number, column: number): Tile => ({
  id,
  type,
  selected: false,
  row,
  column,
})

test('effect wave applies blockers, cookies, counters and boosters once', () => {
  const grid = new TileGrid(4, 2)
  const packaged = createTile(1, TileType.SweetsFish, 0, 0)
  const ordinary = createTile(2, TileType.SweetsBird, 0, 1)
  const cookie = createTile(3, SpecialTileType.Cookie, 1, 1)
  const booster = createTile(4, BoosterType.AreaKettle, 0, 2)
  const counters: Counter[] = []
  const collectObjective = ({ type }: ObjectiveCollection) => {
    const counter = counters.find(item => item.type === type)

    if (counter === undefined) {
      counters.push({ type, count: 1 })
    } else {
      counter.count++
    }
  }

  packaged.blocker = { type: SpecialTileType.Package, health: 1 }
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
  ], 4, 2, collectObjective)

  expect(grid.getTileByIndex(0, 0)).toBe(packaged)
  expect(packaged.blocker).toBeUndefined()
  expect(grid.getTileByIndex(0, 1)).toBeNull()
  expect(grid.getTileByIndex(0, 2)).toBeNull()
  expect(cookie.health).toBe(2)
  expect(counters).toEqual(expect.arrayContaining([
    { type: SpecialTileType.Package, count: 1 },
    { type: TileType.SweetsBird, count: 1 },
  ]))
})
