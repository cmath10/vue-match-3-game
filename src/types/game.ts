import type { BoardTileType, ObjectiveType } from '@/enums/game'
import { SPECIAL_TILE_TYPE } from '@/enums/game'

export type TileBlocker = {
  type: SPECIAL_TILE_TYPE.PACKAGE
  health: number
}

export type Counter = {
  type: ObjectiveType
  count: number
}

export type Objective = {
  type: ObjectiveType
  count: number
}

export type Tile = {
  id: number
  type: BoardTileType
  selected: boolean
  row: number
  column: number
  health?: number
  blocker?: TileBlocker
}
