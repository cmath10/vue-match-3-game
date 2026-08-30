import type { Tile } from '@/domain/types'

import { expect, test } from '@playwright/test'

import { collapseGrid } from '@/game/board/boardTransitions'
import { compileDirectionalGravity } from '@/domain/levels/compileGravity'
import { refillGrid } from '@/game/board/boardTransitions'
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
  const spawns = [0, 1].map(column => ({
    id: `spawn-${column}`,
    entry: { row: 0, column },
    pool: 'fixture',
  }))
  const gravity = compileDirectionalGravity(grid.getTopology(), 'down', spawns).gravity

  const collapseMovements = collapseGrid(grid, gravity)
  let nextId = 5
  const refillMovements = refillGrid(
    grid,
    gravity,
    spawns,
    (_, column, spawnRow) => createTile(nextId++, spawnRow, column),
    collapseMovements.length
  )

  expect(collapseMovements).toEqual([{
    tileId: '1',
    origin: { kind: 'cell', position: { row: 0, column: 0 } },
    path: [{ row: 1, column: 0 }],
    phase: 0,
    resolutionOrder: 0,
  }])
  expect(refillMovements.map(movement => ({
    origin: movement.origin,
    path: movement.path,
    resolutionOrder: movement.resolutionOrder,
  }))).toEqual([
    {
      origin: { kind: 'spawn', spawnId: 'spawn-0' },
      path: [{ row: 0, column: 0 }],
      resolutionOrder: 1,
    },
    {
      origin: { kind: 'spawn', spawnId: 'spawn-1' },
      path: [{ row: 0, column: 1 }, { row: 1, column: 1 }, { row: 2, column: 1 }],
      resolutionOrder: 2,
    },
    {
      origin: { kind: 'spawn', spawnId: 'spawn-1' },
      path: [{ row: 0, column: 1 }, { row: 1, column: 1 }],
      resolutionOrder: 3,
    },
    {
      origin: { kind: 'spawn', spawnId: 'spawn-1' },
      path: [{ row: 0, column: 1 }],
      resolutionOrder: 4,
    },
  ])
})
