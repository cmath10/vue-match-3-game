import type { Board, Position, Tile } from '@/domain/types'

import type { BoardTileType } from '@/domain/enums'
import type TileGrid from '@/game/board/TileGrid'
import type { TileType } from '@/domain/enums'

import { isMatchableTile } from '@/domain/tiles'

export const getMatchableTileBoard = (grid: TileGrid): Board<TileType> => {
  return grid.getTileList()
    .map(row => row.map(tile => tile && isMatchableTile(tile) ? tile.type : null))
}

export const getBoardTileTypeBoard = (grid: TileGrid): Board<BoardTileType> => {
  return grid.getTileList().map(row => row.map(tile => tile?.type ?? null))
}

export const getMovableTileBoard = (grid: TileGrid): boolean[][] => {
  return grid.getTileList().map(row => row.map(tile => tile !== null && !tile.blocker))
}

export const getGridTilePosition = (grid: TileGrid, tile: Tile): Position | null => {
  const index = grid.indexOf(tile)

  return index === null ? null : { row: index[0], column: index[1] }
}
