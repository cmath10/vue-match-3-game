import type { Tile } from '@/domain/types'

import { expect, test } from '@playwright/test'

import { collapseGrid, refillGrid } from '@/game/board/boardTransitions'
import TileGrid from '@/game/board/TileGrid'
import { TileType } from '@/domain/enums'

const createTile = (id: number, row: number, column: number): Tile => ({
  id,
  type: TileType.SweetsBarbaris,
  selected: false,
  row,
  column,
})

test('grid transitions retain stable ids and ordered logical movements', () => {
  const grid = new TileGrid(2, 4)

  grid.setTile(createTile(1, 0, 0), 0, 0)
  grid.setTile(createTile(2, 2, 0), 2, 0)
  grid.setTile(createTile(3, 3, 0), 3, 0)
  grid.setTile(createTile(4, 3, 1), 3, 1)

  const collapseMovements = collapseGrid(grid)
  let nextId = 5
  const refillMovements = refillGrid(grid, 2, 4, (row, column, spawnRow) => {
    const tile = createTile(nextId++, spawnRow, column)

    grid.setTile(tile, row, column, { row: spawnRow, column })

    return tile
  }, collapseMovements.length)

  expect(collapseMovements).toEqual([{
    tileId: '1',
    from: { row: 0, column: 0 },
    to: { row: 1, column: 0 },
    order: 0,
  }])
  expect(refillMovements.map(movement => ({
    from: movement.from,
    to: movement.to,
    order: movement.order,
  }))).toEqual([
    { from: null, to: { row: 0, column: 0 }, order: 1 },
    { from: null, to: { row: 2, column: 1 }, order: 2 },
    { from: null, to: { row: 1, column: 1 }, order: 3 },
    { from: null, to: { row: 0, column: 1 }, order: 4 },
  ])
})
