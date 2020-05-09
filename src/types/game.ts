import { TILE_TYPE } from '@/enums/game'

export type Tile = {
  type: TILE_TYPE | null
  selected: boolean
}
