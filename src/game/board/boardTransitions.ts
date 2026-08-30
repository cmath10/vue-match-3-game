import type { SpawnTile as CreateSpawnTile } from '@/domain/board/gravity'
import type { GravityGraph } from '@/domain/levels/types'
import type { GravityResolution } from '@/domain/board/gravity'
import type { Position } from '@/domain/types'
import type { SpawnDefinition } from '@/domain/levels/types'
import type { Tile } from '@/domain/types'
import type TileGrid from '@/game/board/TileGrid'
import type { TileMovement } from '@/domain/types'

import { resolveGravity } from '@/domain/board/gravity'

type SpawnTile = (row: number, column: number, spawnRow: number) => Tile

const applyResolution = (grid: TileGrid, resolution: GravityResolution<Tile>): TileMovement[] => {
  const spawnedTileIds = new Set(resolution.movements.flatMap(movement => (
    movement.origin.kind === 'spawn' ? [movement.tileId] : []
  )))

  grid.clear()
  resolution.state.occupancy.forEach((row, rowIndex) => row.forEach((tile, columnIndex) => {
    if (tile !== null) {
      const position = spawnedTileIds.has(tile.id.toString()) ? getTilePosition(tile) : undefined

      grid.setTile(tile, rowIndex, columnIndex, position)
    }
  }))

  return resolution.movements
}

const getTilePosition = (tile: Tile): Position => ({ row: tile.row, column: tile.column })

export const collapseGrid = (
  grid: TileGrid,
  gravity: GravityGraph,
  orderOffset = 0
): TileMovement[] => applyResolution(grid, resolveGravity({
  state: grid.getState(),
  graph: gravity,
  spawns: [],
  spawnTile: () => { throw new Error('Collapse cannot spawn tiles') },
  getTileId: tile => tile.id.toString(),
  orderOffset,
}))

export const refillGrid = (
  grid: TileGrid,
  gravity: GravityGraph,
  spawns: readonly SpawnDefinition[],
  spawnTile: SpawnTile,
  orderOffset = 0
): TileMovement[] => {
  const createTile: CreateSpawnTile<Tile> = (_, target, spawnIndex) => (
    spawnTile(target.row, target.column, -1 - spawnIndex)
  )

  return applyResolution(grid, resolveGravity({
    state: grid.getState(),
    graph: gravity,
    spawns,
    spawnTile: createTile,
    getTileId: tile => tile.id.toString(),
    orderOffset,
  }))
}
