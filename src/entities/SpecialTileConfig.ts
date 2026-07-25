import type { ObjectiveType } from '@/domain/enums'
import type { Tile } from '@/domain/types'

import { SpecialTileType, TileType } from '@/domain/enums'

const SPECIAL_MUG_TARGET = 3
const SPECIAL_PACKAGE_TARGET = 6
const SPECIAL_COOKIE_TARGET = 4

export const COOKIE_HEALTH = 3
export const PACKAGE_HEALTH = 1

export const AVAILABLE_TILE_TYPES = [
  TileType.SweetsBarbaris,
  TileType.SweetsFish,
  TileType.SweetsRooster,
  TileType.SweetsPillow,
  TileType.SweetsBird,
]
export const SPECIAL_OBJECTIVE_TYPES = [
  SpecialTileType.Mug,
  SpecialTileType.Package,
  SpecialTileType.Cookie,
]
export const COUNTER_TYPES: ObjectiveType[] = [...AVAILABLE_TILE_TYPES, ...SPECIAL_OBJECTIVE_TYPES]
export const SPECIAL_TARGETS: Record<SpecialTileType, number> = {
  [SpecialTileType.Mug]: SPECIAL_MUG_TARGET,
  [SpecialTileType.Package]: SPECIAL_PACKAGE_TARGET,
  [SpecialTileType.Cookie]: SPECIAL_COOKIE_TARGET,
}

export const isMatchableTile = (tile: Tile): tile is Tile & { type: TileType } => {
  return AVAILABLE_TILE_TYPES.includes(tile.type as TileType)
}

export const isMovableTile = (tile: Tile): boolean => {
  return !tile.blocker
}
