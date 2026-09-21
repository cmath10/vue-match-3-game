import { TileType } from '@/domain/enums'

export const THREE_TILE_TYPES = [
  TileType.SweetsFish,
  TileType.SweetsPillow,
  TileType.SweetsBird,
] as const

export const FOUR_TILE_TYPES = [
  TileType.SweetsBarbaris,
  TileType.SweetsFish,
  TileType.SweetsPillow,
  TileType.SweetsBird,
] as const

export const FIVE_TILE_TYPES = [
  TileType.SweetsBarbaris,
  TileType.SweetsFish,
  TileType.SweetsRooster,
  TileType.SweetsPillow,
  TileType.SweetsBird,
] as const

export const WARM_ZONE_TYPES = [
  TileType.SweetsBarbaris,
  TileType.SweetsRooster,
  TileType.SweetsPillow,
] as const

export const COOL_ZONE_TYPES = [
  TileType.SweetsFish,
  TileType.SweetsBird,
  TileType.SweetsPillow,
] as const
