import { TILE_TYPE } from '@/enums/game'

export type Counter = {
  type: TILE_TYPE
  count: number
}

export type Objective = {
  type: TILE_TYPE
  count: number
}

export type Tile = {
  type: TILE_TYPE | null
  selected: boolean
}
