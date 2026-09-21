import type {
  BoardTopology,
  CellKey,
  Direction,
  GravityEdgeTargetDefinition,
  GravityGraph,
} from '@/domain/levels/types'
import type { LevelCompilationError } from '@/domain/levels/errors'
import type { PointGravityZoneDefinition } from '@/domain/levels/types'
import type { SpawnDefinition } from '@/domain/levels/types'

import { compileGravityGraph } from '@/domain/levels/gravityGraph'
import { createPointZoneGraph } from '@/domain/levels/pointGravityGraph'
import {
  DIRECTIONS,
  getNeighborKeys,
  isValidAnchor,
} from '@/domain/levels/gravityGeometry'
import { levelError } from '@/domain/levels/errors'
import { parseCellKey } from '@/domain/levels/coordinates'

type PointDefinition = Extract<import('@/domain/levels/types').GravityDefinition, { kind: 'point' }>

const getZoneTopology = (
  topology: BoardTopology,
  zone: PointGravityZoneDefinition
): BoardTopology => ({
  bounds: topology.bounds,
  playableCells: new Set(zone.cells.filter(key => topology.playableCells.has(key))),
})

const getTieBreakErrors = (
  tieBreak: readonly Direction[],
  path: readonly (string | number)[]
): LevelCompilationError[] => {
  const unique = new Set(tieBreak)
  const valid = tieBreak.length === DIRECTIONS.length && DIRECTIONS.every(direction => unique.has(direction))

  return valid ? [] : [levelError(
    'invalid-gravity-edge', path, 'Point gravity tieBreak must contain each direction exactly once'
  )]
}

const getZoneIdentityErrors = (
  zone: PointGravityZoneDefinition,
  index: number,
  ids: ReadonlySet<string>
): LevelCompilationError[] => zone.id.length > 0 && !ids.has(zone.id) ? [] : [levelError(
  'invalid-gravity-zone', ['gravity', 'zones', index, 'id'],
  'Point gravity zone id must be unique and non-empty'
)]

const getZoneCellErrors = (
  zone: PointGravityZoneDefinition,
  index: number,
  topology: BoardTopology,
  owners: ReadonlyMap<CellKey, number>
): LevelCompilationError[] => zone.cells.flatMap((key, cellIndex) => (
  topology.playableCells.has(key) && !owners.has(key)
    ? []
    : [levelError(
        'invalid-gravity-zone',
        ['gravity', 'zones', index, 'cells', cellIndex],
        `Point gravity cell ${key} must be playable and belong to exactly one zone`
      )]
))

const isContinuousZone = (topology: BoardTopology): boolean => {
  const remaining = new Set(topology.playableCells)
  const queue = [...remaining].slice(0, 1)

  queue.forEach(key => remaining.delete(key))
  while (queue.length > 0) {
    const key = queue.shift()!

    getNeighborKeys(parseCellKey(key)).forEach(([, neighbor]) => {
      if (remaining.delete(neighbor)) {
        queue.push(neighbor)
      }
    })
  }

  return topology.playableCells.size > 0 && remaining.size === 0
}

const getZoneShapeErrors = (
  index: number,
  topology: BoardTopology
): LevelCompilationError[] => isContinuousZone(topology)
  ? []
  : [levelError(
      'invalid-gravity-zone', ['gravity', 'zones', index, 'cells'],
      'Point gravity zone must contain one non-empty continuous area'
    )]

const getZoneTargetErrors = (
  zone: PointGravityZoneDefinition,
  index: number,
  topology: BoardTopology
): LevelCompilationError[] => isValidAnchor(zone.target, topology.bounds) ? [] : [levelError(
  'invalid-edge-target', ['gravity', 'zones', index, 'target'],
  'Point gravity target must lie on the board boundary'
)]

const compileZone = (
  zone: PointGravityZoneDefinition,
  index: number,
  topology: BoardTopology,
  ids: Set<string>,
  owners: Map<CellKey, number>
) => {
  const zoneTopology = getZoneTopology(topology, zone)
  const errors = [
    ...getZoneIdentityErrors(zone, index, ids),
    ...getZoneCellErrors(zone, index, topology, owners),
    ...getTieBreakErrors(zone.tieBreak, ['gravity', 'zones', index, 'tieBreak']),
    ...getZoneTargetErrors(zone, index, topology),
    ...getZoneShapeErrors(index, zoneTopology),
  ]

  ids.add(zone.id)
  zoneTopology.playableCells.forEach(key => owners.set(key, index))
  return { errors, graph: createPointZoneGraph(zoneTopology, zone) }
}

const getCoverageErrors = (
  topology: BoardTopology,
  owners: ReadonlyMap<CellKey, number>
): LevelCompilationError[] => [...topology.playableCells].flatMap(key => owners.has(key) ? [] : [levelError(
  'invalid-gravity-zone', ['gravity', 'zones'],
  `Playable cell ${key} is not assigned to a point gravity zone`
)])

const getEdgeTargets = (
  definition: PointDefinition,
  zones: readonly ReturnType<typeof compileZone>[]
): GravityEdgeTargetDefinition[] => definition.zones.flatMap((zone, index) => {
  const terminals = zones[index].graph.terminals

  return terminals.length === 0 ? [] : [{
    anchor: zone.target,
    terminals: terminals as [CellKey, ...CellKey[]],
  }]
})

const getCompilationErrors = (
  topology: BoardTopology,
  owners: ReadonlyMap<CellKey, number>,
  zones: readonly ReturnType<typeof compileZone>[],
  graphErrors: readonly LevelCompilationError[]
): LevelCompilationError[] => [
  ...zones.flatMap(item => item.errors),
  ...getCoverageErrors(topology, owners),
  ...graphErrors,
]

export const compilePointGravity = (
  topology: BoardTopology,
  definition: PointDefinition,
  spawns: readonly SpawnDefinition[]
): { gravity: GravityGraph; edgeTargets: GravityEdgeTargetDefinition[]; errors: LevelCompilationError[] } => {
  const ids = new Set<string>()
  const owners = new Map<CellKey, number>()
  const zones = definition.zones.map((zone, index) => compileZone(zone, index, topology, ids, owners))
  const nextByCell = new Map(zones.flatMap(item => [...item.graph.nextByCell]))
  const compiled = compileGravityGraph(topology, nextByCell, spawns)

  return {
    gravity: compiled.gravity,
    edgeTargets: getEdgeTargets(definition, zones),
    errors: getCompilationErrors(topology, owners, zones, compiled.errors),
  }
}
