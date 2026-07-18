import type TileGrid from '@/entities/TileGrid'
import { isBoosterType } from '@/entities/Match3BoosterEffects'
import type { Position } from '@/entities/Match3Engine'
import { isMatchableTile } from '@/entities/Match3SpecialTileConfig'
import type { ObjectiveType } from '@/enums/game'
import { SPECIAL_TILE_TYPE, TILE_TYPE } from '@/enums/game'
import type { Tile } from '@/types/game'

type IncrementCounter = (type: ObjectiveType) => void
type HitMode = 'match' | 'effect'
type HitContext = {
  grid: TileGrid
  width: number
  height: number
  adjacentCookies: Set<Tile>
  incrementCounter: IncrementCounter
  mode: HitMode
}

export const clearMatchedPositions = (
  grid: TileGrid,
  positions: Position[],
  width: number,
  height: number,
  incrementCounter: IncrementCounter
): void => {
  applyHitPositions(grid, positions, width, height, incrementCounter, 'match')
}

export const applyBoosterEffectPositions = (
  grid: TileGrid,
  positions: Position[],
  width: number,
  height: number,
  incrementCounter: IncrementCounter
): void => {
  applyHitPositions(grid, positions, width, height, incrementCounter, 'effect')
}

const applyHitPositions = (
  grid: TileGrid,
  positions: Position[],
  width: number,
  height: number,
  incrementCounter: IncrementCounter,
  mode: HitMode
): void => {
  const adjacentCookies = new Set<Tile>()
  const context = { grid, width, height, adjacentCookies, incrementCounter, mode }

  positions.forEach(position => hitPosition(context, position))
  adjacentCookies.forEach(tile => damageCookie(grid, tile, incrementCounter))
}

const hitPosition = (context: HitContext, { row, column }: Position): void => {
  const tile = context.grid.getTileByIndex(row, column)

  if (tile === null) {
    return
  }

  tile.selected = false

  if (tile.blocker) {
    damagePackage(tile, context.incrementCounter)
  } else if (isMatchableTile(tile)) {
    clearOrdinaryTile(context, tile, { row, column })
  } else if (context.mode === 'effect') {
    hitSpecialTile(context, tile, { row, column })
  }
}

const clearOrdinaryTile = (
  context: HitContext,
  tile: Tile & { type: TILE_TYPE },
  position: Position
): void => {
  collectAdjacentCookies(context, position)
  context.incrementCounter(tile.type)
  context.grid.setTile(null, position.row, position.column)
}

const hitSpecialTile = (context: HitContext, tile: Tile, position: Position): void => {
  if (tile.type === SPECIAL_TILE_TYPE.COOKIE) {
    context.adjacentCookies.add(tile)
  } else if (isBoosterType(tile.type)) {
    context.grid.setTile(null, position.row, position.column)
  }
}

const collectAdjacentCookies = (context: HitContext, { row, column }: Position): void => {
  getNeighborPositions(row, column, context.width, context.height).forEach((position) => {
    const tile = context.grid.getTileByIndex(position.row, position.column)

    if (tile?.type === SPECIAL_TILE_TYPE.COOKIE) {
      context.adjacentCookies.add(tile)
    }
  })
}

const damagePackage = (tile: Tile, incrementCounter: IncrementCounter): void => {
  if (tile.blocker === undefined) {
    return
  }

  tile.blocker.health--

  if (tile.blocker.health <= 0) {
    tile.blocker = undefined
    incrementCounter(SPECIAL_TILE_TYPE.PACKAGE)
  }
}

const damageCookie = (grid: TileGrid, tile: Tile, incrementCounter: IncrementCounter): void => {
  if (tile.type !== SPECIAL_TILE_TYPE.COOKIE || tile.health === undefined) {
    return
  }

  tile.health--

  if (tile.health <= 0) {
    removeCookie(grid, tile, incrementCounter)
  }
}

const removeCookie = (grid: TileGrid, tile: Tile, incrementCounter: IncrementCounter): void => {
  const index = grid.indexOf(tile)

  if (index !== null) {
    incrementCounter(SPECIAL_TILE_TYPE.COOKIE)
    grid.setTile(null, index[0], index[1])
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
