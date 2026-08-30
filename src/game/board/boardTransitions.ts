import type { SpawnTile as CreateSpawnTile } from '@/domain/board/gravity'
import type { GravityGraph } from '@/domain/levels/types'
import type { GravityResolution } from '@/domain/board/gravity'
import type { GravityState } from '@/domain/levels/types'
import type { Position } from '@/domain/types'
import type { SpawnDefinition } from '@/domain/levels/types'
import type { Tile } from '@/domain/types'
import type TileGrid from '@/game/board/TileGrid'
import type { TileMovement } from '@/domain/types'

import { resolveGravity } from '@/domain/board/gravity'

type TransitionOrder = {
  phase?: number
  resolutionOrder?: number
}

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
  gravityState: GravityState,
  order: TransitionOrder = {}
): TileMovement[] => applyResolution(grid, resolveGravity({
  state: grid.getState(),
  graph: gravity,
  gravityState,
  spawns: [],
  spawnTile: () => { throw new Error('Collapse cannot spawn tiles') },
  getTileId: tile => tile.id.toString(),
  orderOffset: order.resolutionOrder,
  phase: order.phase,
}))

export const refillGrid = (
  grid: TileGrid,
  gravity: GravityGraph,
  gravityState: GravityState,
  spawns: readonly SpawnDefinition[],
  spawnTile: CreateSpawnTile<Tile>,
  order: TransitionOrder = {}
): TileMovement[] => {
  return applyResolution(grid, resolveGravity({
    state: grid.getState(),
    graph: gravity,
    gravityState,
    spawns,
    spawnTile,
    getTileId: tile => tile.id.toString(),
    orderOffset: order.resolutionOrder,
    phase: order.phase,
  }))
}
