import type { CollectObjective, Position, Tile } from '@/domain/types'
import type TileGrid from '@/game/board/TileGrid'

import { isBoosterType, isMatchableTile } from '@/domain/tiles'
import { SpecialTileType, TileType } from '@/domain/enums'

type HitMode = 'match' | 'effect'
type HitContext = {
  grid: TileGrid
  width: number
  height: number
  adjacentCookies: Set<Tile>
  collectObjective: CollectObjective
  mode: HitMode
}

export const clearMatchedPositions = (
  grid: TileGrid,
  positions: Position[],
  width: number,
  height: number,
  collectObjective: CollectObjective
): void => {
  applyHitPositions(grid, positions, width, height, collectObjective, 'match')
}

export const applyBoosterEffectPositions = (
  grid: TileGrid,
  positions: Position[],
  width: number,
  height: number,
  collectObjective: CollectObjective
): void => {
  applyHitPositions(grid, positions, width, height, collectObjective, 'effect')
}

const applyHitPositions = (
  grid: TileGrid,
  positions: Position[],
  width: number,
  height: number,
  collectObjective: CollectObjective,
  mode: HitMode
): void => {
  const adjacentCookies = new Set<Tile>()
  const context = { grid, width, height, adjacentCookies, collectObjective, mode }

  positions.forEach(position => hitPosition(context, position))
  adjacentCookies.forEach(tile => damageCookie(grid, tile, collectObjective))
}

const hitPosition = (context: HitContext, { row, column }: Position): void => {
  const tile = context.grid.getTileByIndex(row, column)
  if (tile === null) {
    return
  }

  tile.selected = false

  if (tile.blocker) {
    damagePackage(tile, { row, column }, context.collectObjective)
    return
  }

  if (isMatchableTile(tile)) {
    clearOrdinaryTile(context, tile, { row, column })
    return
  }

  hitNonMatchableTile(context, tile, { row, column })
}

const hitNonMatchableTile = (context: HitContext, tile: Tile, position: Position): void => {
  if (context.mode === 'effect') {
    hitSpecialTile(context, tile, position)
  } else if (isBoosterType(tile.type)) {
    collectAdjacentCookies(context, position)
  }
}

const clearOrdinaryTile = (
  context: HitContext,
  tile: Tile & { type: TileType },
  position: Position
): void => {
  collectAdjacentCookies(context, position)
  context.collectObjective({ tileId: tile.id, type: tile.type, position })
  context.grid.setTile(null, position.row, position.column)
}

const hitSpecialTile = (context: HitContext, tile: Tile, position: Position): void => {
  if (tile.type === SpecialTileType.Cookie) {
    context.adjacentCookies.add(tile)
  } else if (isBoosterType(tile.type)) {
    context.grid.setTile(null, position.row, position.column)
  }
}

const collectAdjacentCookies = (context: HitContext, { row, column }: Position): void => {
  getNeighborPositions(row, column, context.width, context.height).forEach((position) => {
    const tile = context.grid.getTileByIndex(position.row, position.column)

    if (tile?.type === SpecialTileType.Cookie) {
      context.adjacentCookies.add(tile)
    }
  })
}

const damagePackage = (
  tile: Tile,
  position: Position,
  collectObjective: CollectObjective
): void => {
  if (tile.blocker === undefined) {
    return
  }

  tile.blocker.health--

  if (tile.blocker.health <= 0) {
    tile.blocker = undefined
    collectObjective({ tileId: tile.id, type: SpecialTileType.Package, position })
  }
}

const damageCookie = (grid: TileGrid, tile: Tile, collectObjective: CollectObjective): void => {
  if (tile.type !== SpecialTileType.Cookie || tile.health === undefined) {
    return
  }

  tile.health--

  if (tile.health <= 0) {
    removeCookie(grid, tile, collectObjective)
  }
}

const removeCookie = (grid: TileGrid, tile: Tile, collectObjective: CollectObjective): void => {
  const index = grid.indexOf(tile)

  if (index !== null) {
    const [row, column] = index

    collectObjective({
      tileId: tile.id,
      type: SpecialTileType.Cookie,
      position: { row, column },
    })
    grid.setTile(null, row, column)
  }
}

const getNeighborPositions = (row: number, column: number, width: number, height: number): Position[] => {
  return [
    { row: row - 1, column },
    { row: row + 1, column },
    { row, column: column - 1 },
    { row, column: column + 1 },
  ].filter(position => isInsideBoard(position, width, height))
}

const isInsideBoard = ({ row, column }: Position, width: number, height: number): boolean => {
  return row >= 0 && row < height && column >= 0 && column < width
}
