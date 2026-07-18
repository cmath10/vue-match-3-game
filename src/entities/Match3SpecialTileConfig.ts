import type { ObjectiveType } from '@/enums/game'
import type { Tile } from '@/types/game'
import { SPECIAL_TILE_TYPE, TILE_TYPE } from '@/enums/game'

const SPECIAL_MUG_TARGET = 3
const SPECIAL_PACKAGE_TARGET = 6
const SPECIAL_COOKIE_TARGET = 4

export const COOKIE_HEALTH = 3
export const PACKAGE_HEALTH = 1

export const AVAILABLE_TILE_TYPES = [
  TILE_TYPE.SWEETS_BARBARIS,
  TILE_TYPE.SWEETS_FISH,
  TILE_TYPE.SWEETS_ROOSTER,
  TILE_TYPE.SWEETS_PILLOW,
  TILE_TYPE.SWEETS_BIRD,
]
export const SPECIAL_OBJECTIVE_TYPES = [
  SPECIAL_TILE_TYPE.MUG,
  SPECIAL_TILE_TYPE.PACKAGE,
  SPECIAL_TILE_TYPE.COOKIE,
]
export const COUNTER_TYPES: ObjectiveType[] = [...AVAILABLE_TILE_TYPES, ...SPECIAL_OBJECTIVE_TYPES]
export const SPECIAL_TARGETS: Record<SPECIAL_TILE_TYPE, number> = {
  [SPECIAL_TILE_TYPE.MUG]: SPECIAL_MUG_TARGET,
  [SPECIAL_TILE_TYPE.PACKAGE]: SPECIAL_PACKAGE_TARGET,
  [SPECIAL_TILE_TYPE.COOKIE]: SPECIAL_COOKIE_TARGET,
}

export const isMatchableTile = (tile: Tile): tile is Tile & { type: TILE_TYPE } => {
  return AVAILABLE_TILE_TYPES.includes(tile.type as TILE_TYPE)
}

export const isMovableTile = (tile: Tile): boolean => {
  return !tile.blocker
}
