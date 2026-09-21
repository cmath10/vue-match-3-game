import type {
  CellKey,
  CollectorDefinition,
  Direction,
  GravityDefinition,
  InitialCellDefinition,
  LevelDefinition,
} from '@/domain/levels/types'
import type { Objective } from '@/domain/types'
import type { PointGravityZoneDefinition } from '@/domain/levels/types'
import type { Position } from '@/domain/types'
import type { SpawnDefinition, TilePoolDefinition } from '@/domain/levels/types'

import { COOKIE_HEALTH } from '@/domain/config'
import { createPointZoneGraph } from '@/domain/levels/pointGravityGraph'
import { getCellKey } from '@/domain/levels/coordinates'
import { getPointZoneRoots } from '@/domain/levels/pointGravityGraph'
import { PACKAGE_HEALTH } from '@/domain/config'
import { parseCellKey } from '@/domain/levels/coordinates'
import { SpecialTileType } from '@/domain/enums'

export const CATALOG_LEVEL_REVISION = 8
export const MAIN_POOL_ID = 'main'
const ZONE_POOL_ID = 'zone'
const STRONG_PACKAGE_HEALTH = 2
const STRONG_COOKIE_HEALTH = 4

type TileTypes = TilePoolDefinition['types']

type CatalogLevelOptions = {
  id: number
  layout: readonly string[]
  mainTypes: TileTypes
  zoneTypes?: TileTypes
  gravity: GravityDefinition
  objectives: readonly Objective[]
  spawnCells: readonly Position[]
  terminalCells: readonly Position[]
}

type DirectionalLevelOptions = Omit<
  CatalogLevelOptions,
  'gravity' | 'spawnCells' | 'terminalCells'
> & { direction: Direction }

export type CatalogPointZoneDefinition = Omit<PointGravityZoneDefinition, 'cells'> & {
  cells: readonly Position[]
}

type PointLevelOptions = Omit<
  CatalogLevelOptions,
  'gravity' | 'spawnCells' | 'terminalCells'
> & {
  zones: readonly CatalogPointZoneDefinition[]
}

type FlowLevelOptions = Omit<CatalogLevelOptions, 'spawnCells' | 'terminalCells'> & {
  gravity: Extract<GravityDefinition, { kind: 'flow' }>
}

const getCells = (layout: readonly string[]): Position[] => layout.flatMap((line, row) => (
  Array.from(line).flatMap((token, column) => token === '.' ? [] : [{ row, column }])
))

const getDelta = (direction: Direction): Position => ({
  down: { row: 1, column: 0 },
  left: { row: 0, column: -1 },
  right: { row: 0, column: 1 },
  up: { row: -1, column: 0 },
})[direction]

const move = (position: Position, delta: Position, factor = 1): Position => ({
  row: position.row + delta.row * factor,
  column: position.column + delta.column * factor,
})

const getDirectionalBoundary = (
  layout: readonly string[],
  direction: Direction,
  factor: number
): Position[] => {
  const cells = getCells(layout)
  const keys = new Set(cells.map(getCellKey))
  const delta = getDelta(direction)

  return cells.filter(cell => !keys.has(getCellKey(move(cell, delta, factor))))
}

const createPackageCell = (pool: string, health: number): InitialCellDefinition => ({
  kind: 'random',
  pool,
  blocker: { type: SpecialTileType.Package, health },
})

const createCookieCell = (health: number): InitialCellDefinition => ({
  kind: 'fixed',
  tile: { kind: 'special', type: SpecialTileType.Cookie, health },
})

const createLegend = (): Record<string, InitialCellDefinition> => ({
  A: { kind: 'random', pool: MAIN_POOL_ID },
  B: { kind: 'random', pool: ZONE_POOL_ID },
  P: createPackageCell(MAIN_POOL_ID, PACKAGE_HEALTH),
  Q: createPackageCell(ZONE_POOL_ID, STRONG_PACKAGE_HEALTH),
  M: { kind: 'fixed', tile: { kind: 'special', type: SpecialTileType.Mug } },
  C: createCookieCell(COOKIE_HEALTH),
  D: createCookieCell(STRONG_COOKIE_HEALTH),
})

const createPools = (main: TileTypes, zone = main): LevelDefinition['tilePools'] => ({
  [MAIN_POOL_ID]: { types: main },
  [ZONE_POOL_ID]: { types: zone },
})

const createSpawns = (cells: readonly Position[]): SpawnDefinition[] => cells.map((entry, index) => ({
  id: `spawn-${index}`,
  entry,
  pool: MAIN_POOL_ID,
}))

const hasMugObjective = (objectives: readonly Objective[]): boolean => (
  objectives.some(objective => objective.type === SpecialTileType.Mug)
)

const createCollectors = (
  cells: readonly Position[],
  objectives: readonly Objective[]
): CollectorDefinition[] => hasMugObjective(objectives) ? cells.map((cell, index) => ({
  id: `mug-exit-${index}`,
  cell,
  accepts: [SpecialTileType.Mug],
})) : []

const createLevel = (options: CatalogLevelOptions): LevelDefinition => ({
  id: options.id,
  revision: CATALOG_LEVEL_REVISION,
  initialBoard: { layout: options.layout, legend: createLegend() },
  tilePools: createPools(options.mainTypes, options.zoneTypes),
  gravity: options.gravity,
  spawns: createSpawns(options.spawnCells),
  collectors: createCollectors(options.terminalCells, options.objectives),
  objectives: options.objectives,
})

export const defineDirectionalLevel = (options: DirectionalLevelOptions): LevelDefinition => (
  createLevel({
    ...options,
    gravity: { kind: 'direction', direction: options.direction },
    spawnCells: getDirectionalBoundary(options.layout, options.direction, -1),
    terminalCells: getDirectionalBoundary(options.layout, options.direction, 1),
  })
)

const getPointLevelGeometry = (
  layout: readonly string[],
  zones: readonly CatalogPointZoneDefinition[]
) => {
  const bounds = { width: Array.from(layout[0]).length, height: layout.length }
  const definitions = zones.map((zone): PointGravityZoneDefinition => ({
    ...zone,
    cells: zone.cells.map(getCellKey),
  }))
  const graphs = definitions.map((zone) => createPointZoneGraph({
    bounds,
    playableCells: new Set(zone.cells),
  }, zone))

  return {
    gravity: { kind: 'point' as const, zones: definitions },
    spawnCells: graphs.flatMap(graph => getPointZoneRoots(graph).map(parseCellKey)),
    terminalCells: graphs.flatMap(graph => graph.terminals.map(parseCellKey)),
  }
}

export const definePointLevel = (options: PointLevelOptions): LevelDefinition => createLevel({
  ...options,
  ...getPointLevelGeometry(options.layout, options.zones),
})

const getFlowRoots = (gravity: FlowLevelOptions['gravity']): Position[] => {
  const incoming = new Set(Object.values(gravity.nextByCell).filter((key): key is CellKey => key !== null))

  return Object.keys(gravity.nextByCell)
    .filter(key => !incoming.has(key as CellKey))
    .map(key => parseCellKey(key as CellKey))
}

const getFlowTerminals = (gravity: FlowLevelOptions['gravity']): Position[] => (
  gravity.edgeTargets.flatMap(target => target.terminals.map(parseCellKey))
)

export const defineFlowLevel = (options: FlowLevelOptions): LevelDefinition => createLevel({
  ...options,
  spawnCells: getFlowRoots(options.gravity),
  terminalCells: getFlowTerminals(options.gravity),
})

export const rectangle = (width: number, height: number, token = 'A'): string[] => (
  Array.from({ length: height }, () => token.repeat(width))
)
