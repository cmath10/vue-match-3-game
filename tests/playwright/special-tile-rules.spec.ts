import type { BoardTileType } from '@/enums/game'
import type { Counter } from '@/types/game'
import type { ObjectiveCollection } from '@/entities/Match3ObjectiveCollection'
import type { ObjectiveType } from '@/enums/game'
import type { Tile } from '@/types/game'

import { expect, test } from '@playwright/test'

import { BOOSTER_TYPE } from '@/enums/game'
import {
  clearMatchedPositions,
  collectDroppedMugs,
  isMovableTile,
} from '@/entities/Match3SpecialTiles'
import { placeCreatedBoosters } from '@/entities/Match3BoardBoosters'
import { SPECIAL_TILE_TYPE, TILE_TYPE } from '@/enums/game'
import TileGrid from '@/entities/TileGrid'

const createTile = (id: number, type: BoardTileType = TILE_TYPE.SWEETS_BARBARIS): Tile => ({
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
  const counters = [counter(TILE_TYPE.SWEETS_BARBARIS), counter(SPECIAL_TILE_TYPE.PACKAGE)]
  const collectObjective = createCollector(counters)

  tile.blocker = { type: SPECIAL_TILE_TYPE.PACKAGE, health: 1 }
  grid.setTile(tile, 1, 1)

  clearMatchedPositions(grid, [{ row: 1, column: 1 }], 3, 3, collectObjective)

  expect(grid.getTileByIndex(1, 1)).toBe(tile)
  expect(tile.blocker).toBeUndefined()
  expect(counters.find(item => item.type === SPECIAL_TILE_TYPE.PACKAGE)?.count).toBe(1)
  expect(counters.find(item => item.type === TILE_TYPE.SWEETS_BARBARIS)?.count).toBe(0)

  clearMatchedPositions(grid, [{ row: 1, column: 1 }], 3, 3, collectObjective)

  expect(grid.getTileByIndex(1, 1)).toBeNull()
  expect(counters.find(item => item.type === TILE_TYPE.SWEETS_BARBARIS)?.count).toBe(1)
})

test('package blocker makes the underlying tile immovable', () => {
  const tile = createTile(1)

  expect(isMovableTile(tile)).toBe(true)

  tile.blocker = { type: SPECIAL_TILE_TYPE.PACKAGE, health: 1 }

  expect(isMovableTile(tile)).toBe(false)
})

test('cookie is movable but is not cleared by direct matches', () => {
  const grid = new TileGrid(3, 3)
  const cookie = createTile(1, SPECIAL_TILE_TYPE.COOKIE)
  const counters = [counter(SPECIAL_TILE_TYPE.COOKIE)]
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
  const cookie = createTile(1, SPECIAL_TILE_TYPE.COOKIE)
  const counters = [counter(SPECIAL_TILE_TYPE.COOKIE), counter(TILE_TYPE.SWEETS_BARBARIS)]
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
  expect(counters.find(item => item.type === SPECIAL_TILE_TYPE.COOKIE)?.count).toBe(1)
})

test('cookie takes damage next to the tile preserved as a created booster', () => {
  const grid = new TileGrid(3, 3)
  const cookie = createTile(1, SPECIAL_TILE_TYPE.COOKIE)
  const counters = [counter(TILE_TYPE.SWEETS_BARBARIS)]
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
    type: BOOSTER_TYPE.COLUMN_FIRECRACKER,
    position: { row: 1, column: 1 },
  }])

  clearMatchedPositions(grid, positions, 3, 3, collectObjective)

  expect(cookie.health).toBe(1)
  expect(grid.getTileByIndex(1, 1)?.type).toBe(BOOSTER_TYPE.COLUMN_FIRECRACKER)
  expect(counters[0].count).toBe(2)
})

test('mug is collected when it reaches the bottom row', () => {
  const grid = new TileGrid(3, 3)
  const mug = createTile(1, SPECIAL_TILE_TYPE.MUG)
  const counters = [counter(SPECIAL_TILE_TYPE.MUG)]
  const collectObjective = createCollector(counters)

  grid.setTile(mug, 2, 1)
  collectDroppedMugs(grid, 3, 3, collectObjective)

  expect(grid.getTileByIndex(2, 1)).toBeNull()
  expect(counters[0].count).toBe(1)
})

test('consecutive mugs at the bottom are collected in the same transition', () => {
  const grid = new TileGrid(3, 3)
  const counters = [counter(SPECIAL_TILE_TYPE.MUG)]
  const collectObjective = createCollector(counters)

  grid.setTile(createTile(1, SPECIAL_TILE_TYPE.MUG), 1, 1)
  grid.setTile(createTile(2, SPECIAL_TILE_TYPE.MUG), 2, 1)
  collectDroppedMugs(grid, 3, 3, collectObjective)

  expect(grid.getTileByIndex(1, 1)).toBeNull()
  expect(grid.getTileByIndex(2, 1)).toBeNull()
  expect(counters[0].count).toBe(2)
})
