import type {
  BoardTileType,
  BoosterCombinationType,
  BoosterType,
  ObjectiveType,
  SpecialTileType,
  TileType,
} from '@/domain/enums'

export type Position = {
  row: number
  column: number
}

export type TileBlocker = {
  type: SpecialTileType.Package
  health: number
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

export type Counter = {
  type: ObjectiveType
  count: number
}

export type Objective = {
  type: ObjectiveType
  count: number
}

export type ObjectiveCollection = {
  tileId: number
  type: ObjectiveType
  position: Position
}

export type CollectObjective = (collection: ObjectiveCollection) => void

export type BoardTile = string
export type BoardCell<T extends BoardTile = BoardTile> = T | null
export type Board<T extends BoardTile = BoardTile> = Array<Array<BoardCell<T>>>

export type MoveResult<T extends BoardTile = BoardTile> = {
  accepted: boolean
  board: Array<T[]>
  cleared: T[]
  cascades: number
}

export type MatchOrientation = 'row' | 'column'

export type MatchLine<T extends BoardTile = BoardTile> = {
  type: T
  orientation: MatchOrientation
  positions: Position[]
}

export type TileMovement = {
  tileId: string
  from: Position | null
  to: Position
  order: number
}

export type BoosterCreation = {
  type: BoosterType
  position: Position
}

export type MoveMatch = {
  positions: Position[]
  boosters: BoosterCreation[]
}

export type BoardEffect = {
  source: Position
  positions: Position[]
  booster: BoosterType
  targetType?: TileType
}

export type GeometricBoosterType =
  | BoosterType.RowFirecracker
  | BoosterType.ColumnFirecracker
  | BoosterType.AreaKettle

export type BoosterActivation = {
  source: Position
  targetType?: TileType
}

export type BoosterCombination = {
  type: BoosterCombinationType
  source: Position
  participants: [Position, Position]
  boosters: [BoosterType, BoosterType]
}

export type BoosterSwipe = {
  activations: BoosterActivation[]
  combination: BoosterCombination | null
}

export type BoosterWave = {
  effects: BoardEffect[]
  positions: Position[]
  activatedBoosters: BoosterType[]
  combination: BoosterCombination | null
}

export type SelectButtonBoxTarget = (types: TileType[]) => TileType | null

export type GameResult = 'win' | 'lose'
