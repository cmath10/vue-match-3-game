import { Point2D } from '@/types/geometry'

export type Cell = {
  point: Point2D
  selected: boolean
}

export type Tile = {
  point: Point2D
  type: string
}
