import type { Board } from '@/entities/Match3Engine'
import type { BoardTileType } from '@/enums/game'
import type { Position } from '@/entities/Match3Engine'
import type { Tile } from '@/types/game'
import type { TILE_TYPE } from '@/enums/game'
import type TileGrid from '@/entities/TileGrid'

import { isMatchableTile } from '@/entities/Match3SpecialTileConfig'

export const getMatchableTileBoard = (grid: TileGrid): Board<TILE_TYPE> => {
  return grid.getTileList()
    .map(row => row.map(tile => tile && isMatchableTile(tile) ? tile.type : null))
}

export const getBoardTileTypeBoard = (grid: TileGrid): Board<BoardTileType> => {
  return grid.getTileList().map(row => row.map(tile => tile?.type ?? null))
}

export const getGridTilePosition = (grid: TileGrid, tile: Tile): Position | null => {
  const index = grid.indexOf(tile)

  return index === null ? null : { row: index[0], column: index[1] }
}
