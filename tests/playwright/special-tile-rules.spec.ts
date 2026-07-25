import type { Counter, ObjectiveCollection, Tile } from '@/domain/types'

import type { BoardTileType, ObjectiveType } from '@/domain/enums'

import { expect, test } from '@playwright/test'

import { BoosterType } from '@/domain/enums'
import {
  clearMatchedPositions,
  collectDroppedMugs,
  isMovableTile,
} from '@/entities/SpecialTiles'
import { placeCreatedBoosters } from '@/entities/BoardBoosters'
import { SpecialTileType } from '@/domain/enums'
import TileGrid from '@/entities/TileGrid'
import { TileType } from '@/domain/enums'

const createTile = (id: number, type: BoardTileType = TileType.SweetsBarbaris): Tile => ({
  id,
  type,
  selected: false,
  row: 0,
  column: 0,
})

const counter = (type: ObjectiveType): Counter => ({ type, count: 0 })
const createCollector = (counters: Counter[]) => ({ type }: ObjectiveCollection): void => {
  counters.find(item => item.type === type)!.count++
}

test('package blocker breaks before the underlying tile is cleared', () => {
  const grid = new TileGrid(3, 3)
  const tile = createTile(1)
  const counters = [counter(TileType.SweetsBarbaris), counter(SpecialTileType.Package)]
  const collectObjective = createCollector(counters)

  tile.blocker = { type: SpecialTileType.Package, health: 1 }
  grid.setTile(tile, 1, 1)

  clearMatchedPositions(grid, [{ row: 1, column: 1 }], 3, 3, collectObjective)

  expect(grid.getTileByIndex(1, 1)).toBe(tile)
  expect(tile.blocker).toBeUndefined()
  expect(counters.find(item => item.type === SpecialTileType.Package)?.count).toBe(1)
  expect(counters.find(item => item.type === TileType.SweetsBarbaris)?.count).toBe(0)

  clearMatchedPositions(grid, [{ row: 1, column: 1 }], 3, 3, collectObjective)

  expect(grid.getTileByIndex(1, 1)).toBeNull()
  expect(counters.find(item => item.type === TileType.SweetsBarbaris)?.count).toBe(1)
})

test('package blocker makes the underlying tile immovable', () => {
  const tile = createTile(1)

  expect(isMovableTile(tile)).toBe(true)

  tile.blocker = { type: SpecialTileType.Package, health: 1 }

  expect(isMovableTile(tile)).toBe(false)
})

test('cookie is movable but is not cleared by direct matches', () => {
  const grid = new TileGrid(3, 3)
  const cookie = createTile(1, SpecialTileType.Cookie)
  const counters = [counter(SpecialTileType.Cookie)]
  const collectObjective = createCollector(counters)

  cookie.health = 2
  grid.setTile(cookie, 1, 1)

  expect(isMovableTile(cookie)).toBe(true)

  clearMatchedPositions(grid, [{ row: 1, column: 1 }], 3, 3, collectObjective)

  expect(grid.getTileByIndex(1, 1)).toBe(cookie)
  expect(cookie.health).toBe(2)
  expect(counters[0].count).toBe(0)
})

test('cookie takes damage from adjacent matches and is counted when broken', () => {
  const grid = new TileGrid(3, 3)
  const cookie = createTile(1, SpecialTileType.Cookie)
  const counters = [counter(SpecialTileType.Cookie), counter(TileType.SweetsBarbaris)]
  const collectObjective = createCollector(counters)

  cookie.health = 2
  grid.setTile(cookie, 1, 1)
  grid.setTile(createTile(2), 1, 0)
  clearMatchedPositions(grid, [{ row: 1, column: 0 }], 3, 3, collectObjective)

  expect(cookie.health).toBe(1)
  expect(grid.getTileByIndex(1, 1)).toBe(cookie)

  grid.setTile(createTile(3), 1, 0)
  clearMatchedPositions(grid, [{ row: 1, column: 0 }], 3, 3, collectObjective)

  expect(grid.getTileByIndex(1, 1)).toBeNull()
  expect(counters.find(item => item.type === SpecialTileType.Cookie)?.count).toBe(1)
})

test('cookie takes damage next to the tile preserved as a created booster', () => {
  const grid = new TileGrid(3, 3)
  const cookie = createTile(1, SpecialTileType.Cookie)
  const counters = [counter(TileType.SweetsBarbaris)]
  const collectObjective = createCollector(counters)
  const positions = [
    { row: 1, column: 0 },
    { row: 1, column: 1 },
    { row: 1, column: 2 },
  ]

  cookie.health = 2
  grid.setTile(cookie, 0, 1)
  positions.forEach(({ row, column }, index) => {
    grid.setTile(createTile(index + 2), row, column)
  })

  placeCreatedBoosters(grid, [{
    type: BoosterType.ColumnFirecracker,
    position: { row: 1, column: 1 },
  }])

  clearMatchedPositions(grid, positions, 3, 3, collectObjective)

  expect(cookie.health).toBe(1)
  expect(grid.getTileByIndex(1, 1)?.type).toBe(BoosterType.ColumnFirecracker)
  expect(counters[0].count).toBe(2)
})

test('mug is collected when it reaches the bottom row', () => {
  const grid = new TileGrid(3, 3)
  const mug = createTile(1, SpecialTileType.Mug)
  const counters = [counter(SpecialTileType.Mug)]
  const collectObjective = createCollector(counters)

  grid.setTile(mug, 2, 1)
  collectDroppedMugs(grid, 3, 3, collectObjective)

  expect(grid.getTileByIndex(2, 1)).toBeNull()
  expect(counters[0].count).toBe(1)
})

test('consecutive mugs at the bottom are collected in the same transition', () => {
  const grid = new TileGrid(3, 3)
  const counters = [counter(SpecialTileType.Mug)]
  const collectObjective = createCollector(counters)

  grid.setTile(createTile(1, SpecialTileType.Mug), 1, 1)
  grid.setTile(createTile(2, SpecialTileType.Mug), 2, 1)
  collectDroppedMugs(grid, 3, 3, collectObjective)

  expect(grid.getTileByIndex(1, 1)).toBeNull()
  expect(grid.getTileByIndex(2, 1)).toBeNull()
  expect(counters[0].count).toBe(2)
})
