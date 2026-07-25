import type { BoardTileType } from '@/domain/enums'
import type { Tile } from '@/domain/types'

import { AVAILABLE_TILE_TYPES } from '@/domain/config'
import { BoosterType, TileType } from '@/domain/enums'

export const isTileType = (type: BoardTileType | null): type is TileType => {
  return Object.values(TileType).includes(type as TileType)
}

export const isBoosterType = (type: BoardTileType | null): type is BoosterType => {
  return Object.values(BoosterType).includes(type as BoosterType)
}

export const isMatchableTile = (tile: Tile): tile is Tile & { type: TileType } => {
  return AVAILABLE_TILE_TYPES.includes(tile.type as TileType)
}

export const isMovableTile = (tile: Tile): boolean => {
  return !tile.blocker
}
