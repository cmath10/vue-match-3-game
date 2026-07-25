import type { ObjectiveType } from '@/enums/game'
import type { Position } from '@/entities/Match3Engine'

export type ObjectiveCollection = {
  tileId: number
  type: ObjectiveType
  position: Position
}

export type CollectObjective = (collection: ObjectiveCollection) => void
