import type { BoosterType } from '@/domain/enums'
import type { Objective, Position } from '@/domain/types'
import type { SpecialTileType, TileType } from '@/domain/enums'

export type CellKey = `${number}:${number}`
export type TilePoolId = string
export type LayoutToken = string
export type SpawnId = string
export type CollectorId = string

export type BoardBounds = {
  width: number
  height: number
}

export type BoardTopology = {
  bounds: BoardBounds
  playableCells: ReadonlySet<CellKey>
}

export type PackageBlockerDefinition = {
  type: SpecialTileType.Package
  health: number
}

export type FixedTileDefinition =
  | { kind: 'ordinary'; type: TileType; blocker?: PackageBlockerDefinition }
  | { kind: 'booster'; type: BoosterType }
  | { kind: 'special'; type: SpecialTileType.Mug }
  | { kind: 'special'; type: SpecialTileType.Cookie; health: number }

export type InitialCellDefinition =
  | { kind: 'random'; pool: TilePoolId; blocker?: PackageBlockerDefinition }
  | { kind: 'fixed'; tile: FixedTileDefinition }

export type TilePoolDefinition = {
  types: readonly [TileType, ...TileType[]]
}

export type InitialBoardDefinition = {
  layout: readonly string[]
  legend: Readonly<Record<LayoutToken, InitialCellDefinition>>
}

export type InitialBoardPlan = {
  cells: ReadonlyMap<CellKey, InitialCellDefinition>
}

export type Direction = 'down' | 'up' | 'left' | 'right'

export type BoardEdgeAnchor =
  | { side: 'top' | 'bottom'; column: number }
  | { side: 'left' | 'right'; row: number }

export type GravityEdgeTargetDefinition = {
  anchor: BoardEdgeAnchor
  terminals: readonly [CellKey, ...CellKey[]]
}

export type PointGravityZoneDefinition = {
  id: string
  cells: readonly CellKey[]
  target: BoardEdgeAnchor
  tieBreak: readonly Direction[]
}

export type GravityDefinition =
  | { kind: 'direction'; direction: Direction }
  | { kind: 'point'; zones: readonly PointGravityZoneDefinition[] }
  | {
      kind: 'flow'
      nextByCell: Readonly<Record<CellKey, CellKey | null>>
      edgeTargets: readonly GravityEdgeTargetDefinition[]
    }

export type GravityNode = {
  next: CellKey | null
  incoming: readonly CellKey[]
}

export type GravityGraph = {
  nodes: ReadonlyMap<CellKey, GravityNode>
  settlementOrder: readonly CellKey[]
}

export type GravityState = {
  nextIncomingIndexByCell: Map<CellKey, number>
}

export type SpawnDefinition = {
  id: SpawnId
  entry: Position
  pool: TilePoolId
}

export type CollectorDefinition = {
  id: CollectorId
  cell: Position
  accepts: readonly [SpecialTileType.Mug, ...SpecialTileType.Mug[]]
}

export type BoardEdgeGuide =
  | {
      kind: 'gravity'
      anchor: BoardEdgeAnchor
      terminals: readonly [Position, ...Position[]]
    }
  | {
      kind: 'collector'
      anchor: BoardEdgeAnchor
      terminal: Position
      collectorId: CollectorId
    }

export type LevelDefinition = {
  id: number
  revision: number
  initialBoard: InitialBoardDefinition
  tilePools: Readonly<Record<TilePoolId, TilePoolDefinition>>
  gravity: GravityDefinition
  spawns: readonly SpawnDefinition[]
  collectors: readonly CollectorDefinition[]
  objectives: readonly Objective[]
}

export type CompiledLevel = {
  id: number
  revision: number
  topology: BoardTopology
  initialBoard: InitialBoardPlan
  tilePools: ReadonlyMap<TilePoolId, TilePoolDefinition>
  gravity: GravityGraph
  edgeGuides: readonly BoardEdgeGuide[]
  spawns: readonly SpawnDefinition[]
  collectors: readonly CollectorDefinition[]
  objectives: readonly Objective[]
}
